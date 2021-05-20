// ==UserScript==
// @name           Nav-bar Toolbar Button Slider
// @author         aminomancer
// @homepage       https://github.com/aminomancer
// @description    Wrap all toolbar buttons after #urlbar-container in a scrollable div. It can scroll horizontally through the buttons by scrolling up/down with a mousewheel, like the tab bar. You can change userChrome.toolbarSlider.width in about:config to make the container wider or smaller. If you choose 12, it'll be 12 buttons long. When the window gets *really* small, the slider disappears and the toolbar buttons are placed into the normal widget overflow panel. You can specify more buttons to exclude from the slider by adding their IDs (in quotes, separated by commas) to userChrome.toolbarSlider.excludeButtons in about:config. For example you might type ["bookmarks-menu-button", "downloads-button"] if you want those to stay outside of the slider. You can also decide whether to exclude flexible space springs from the slider by toggling userChrome.toolbarSlider.excludeFlexibleSpace in about:config. By default, springs are excluded. To scroll faster you can add a multiplier right before scrollByPixels is called, like scrollAmount = scrollAmount * 1.5 or something like that. Doesn't handle touch events yet since I don't have a touchpad to test it on. Let me know if you have any ideas though.
// ==/UserScript==

(() => {
    /**
     * get an element's x coordinate
     * @param {object} el (a DOM node)
     * @returns the DOM node's x coordinate
     */
    function rectX(el) {
        return el.getBoundingClientRect().x;
    }

    /**
     * get the border-box width for an element. used for calculating scroll distances.
     * if we used other methods, we'd miss the margins at the very least and end up undershooting distances, which is cumulative.
     * @param {object} el (a DOM node)
     * @returns the DOM node's total effective width
     */
    function parseWidth(el) {
        let style = window.getComputedStyle(el);
        let width = el.clientWidth;
        let margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
        let padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        let border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
        return width + margin + padding + border;
    }

    /**
     * smoothly scroll a slider so that the passed element ends up as close to the center of the slider as possible.
     * native methods like scrollIntoView would only scroll the slider until the element is visible,
     * which would leave it at the left or right edge of the slider.
     * not something we want for a button that's supposed to be active, in focus.
     * @param {object} el (a DOM node to be scrolled to)
     * @param {object} slider (a DOM node, the inner slider, not the container)
     */
    function smoothCenterScrollTo(el, slider) {
        let container = slider.parentElement;
        let buttonX = rectX(el) - rectX(slider);
        let widgetWidth = parseWidth(el);
        let midpoint = container.clientWidth / 2;
        container.scrollTo({
            left: buttonX + widgetWidth / 2 - midpoint,
            behavior: "auto",
        });
    }

    /**
     * given a set of DOM nodes, append them to another DOM node
     * @param {object} nodes (an iterable object)
     * @param {object} container (a DOM node)
     */
    function appendLoop(nodes, container) {
        Array.from(nodes).forEach((button) => {
            container.appendChild(button);
        });
    }

    // do the thing
    function startup() {
        const prefsvc = Services.prefs;
        const widthPref = "userChrome.toolbarSlider.width";
        const excludedPref = "userChrome.toolbarSlider.excludeButtons";
        const springPref = "userChrome.toolbarSlider.excludeFlexibleSpace";
        const collapsePref = "userChrome.toolbarSlider.collapseSliderOnOverflow";
        let outer = document.createElement("toolbaritem");
        let inner = document.createElement("hbox");
        let kids = inner.children;
        let cNavBar = document.getElementById("nav-bar");
        let cTarget = document.getElementById(cNavBar.getAttribute("customizationtarget"));
        let cOverflow = document.getElementById(cNavBar.getAttribute("overflowtarget"));
        let toolbarContextMenu = document.getElementById("toolbar-context-menu");
        let urlbar = document.getElementById("urlbar-container");
        let bin = document.getElementById("mainPopupSet");
        let widgets = cTarget.children;
        let domArray = [];

        let prefHandler = {
            handleEvent(e) {
                if (e.type !== "unload") return;
                window.removeEventListener("unload", this, false);
                prefsvc.removeObserver(widthPref, this);
            },
            async observe(sub, _top, pref) {
                let value = this.getPref(sub, pref);
                switch (pref) {
                    case widthPref:
                        if (value === null) value = 11;
                        this.width = value * 32;
                        if (outer.ready) outer.style.maxWidth = `${this.width}px`;
                        break;
                    case collapsePref:
                        if (value === null) value = true;
                        this.collapse = value;
                        value
                            ? urlbar.style.removeProperty("min-width")
                            : (urlbar.style.minWidth = "revert");
                        if (outer.ready) {
                            outer.setAttribute("overflows", value);
                            if (cNavBar.getAttribute("overflowing") && !value) {
                                await cNavBar.overflowable._moveItemsBackToTheirOrigin(true);
                                let array = await convertToArray(widgets);
                                backToNavbar(array, inner);
                                outer.style.display = "-moz-box";
                            }
                        }
                        break;
                }
            },
            getPref(root, pref) {
                switch (root.getPrefType(pref)) {
                    case root.PREF_BOOL:
                        return root.getBoolPref(pref);
                    case root.PREF_INT:
                        return root.getIntPref(pref);
                    case root.PREF_STRING:
                        return root.getStringPref(pref);
                    default:
                        return null;
                }
            },
            initialSet() {
                if (!prefsvc.prefHasUserValue(widthPref)) prefsvc.setIntPref(widthPref, 11);
                if (!prefsvc.prefHasUserValue(collapsePref))
                    prefsvc.setBoolPref(collapsePref, true);
                if (!prefsvc.prefHasUserValue(excludedPref))
                    prefsvc.setStringPref(excludedPref, "[]");
                if (!prefsvc.prefHasUserValue(springPref)) prefsvc.setBoolPref(springPref, true);
                this.observe(Services.prefs, null, widthPref);
                this.observe(Services.prefs, null, collapsePref);
            },
            attachListeners() {
                window.addEventListener("unload", this, false);
                prefsvc.addObserver(widthPref, this);
                prefsvc.addObserver(collapsePref, this);
            },
        };

        let cuiListen = {
            onCustomizeStart() {
                let isOverflowing = prefHandler.collapse && cNavBar.getAttribute("overflowing");
                if (!isOverflowing) unwrapAll(kids, cTarget);
                /* temporarily move the slider out of the way. we don't want to delete it since we only want to add listeners and observers once per window.
                the slider needs to be out of the customization target during customization, or else we get a tiny bug where dragging a widget ahead of the empty slider causes the widget to teleport to the end. */
                bin.appendChild(outer);
                outer.style.display = isOverflowing ? "none" : "-moz-box";
            },
            async onCustomizeEnd() {
                let isOverflowing = prefHandler.collapse && cNavBar.getAttribute("overflowing");
                let array = await convertToArray(widgets);
                if (isOverflowing) {
                    wrapAll(array, cOverflow);
                    cOverflow.insertBefore(outer, cOverflow.firstElementChild);
                } else wrapAll(array, inner);
                outer.style.display = isOverflowing ? "none" : "-moz-box";
            },
            onWidgetOverflow(aNode, aContainer) {
                if (aNode.ownerGlobal !== window) return;
                if (aNode === outer && aContainer === cTarget) unwrapAll(kids, cOverflow);
                outer.style.display = "none";
            },
            async onWidgetUnderflow(aNode, aContainer) {
                if (aNode.ownerGlobal !== window) return;
                if (aNode === outer && aContainer === cTarget) {
                    let array = await convertToArray(cOverflow.children);
                    backToNavbar(array, inner);
                    outer.style.display = "-moz-box";
                }
            },
            onWidgetAfterDOMChange(aNode, aNextNode, aContainer, aWasRemoval) {
                // if the dom change was the removal of a toolbar button node, do nothing, unless we hid it before removal via context menu.
                if (aWasRemoval) {
                    if (aNode.hidingBeforeRemoval) {
                        aNode.style.removeProperty("visibility");
                        aNode.hidingBeforeRemoval = false;
                    }
                    return;
                }
                /* first makes sure that "this" refers to the window where the node was created, otherwise this would run multiple times per-window if you have more than one window open.
                second makes sure that the node being mutated is actually in the nav-bar, since there are other widget areas.
                third makes sure we're not in customize mode, since that involves a lot of dom changes and we want to basically pause this whole feature during customize mode.
                if all are true then we call pickUpOrphans to wrap any widgets that aren't already wrapped. */
                if (
                    aNode.ownerGlobal === window &&
                    aContainer === cTarget &&
                    !CustomizationHandler.isCustomizing()
                )
                    pickUpOrphans(aNode);
            },
            onWindowClosed(aWindow) {
                /* argument 2 of this expression detaches listener for window that got closed. but other windows still have listeners that hear about the closed window.
                if a window happens to be open to the "customize" page when the window closes, that window won't send an onCustomizeEnd event.
                so the slider containers in EVERY window would remain unwrapped after the window closes.
                so when a window closes, we need to check if the window that sent the closed event is in customization.
                if it is, then we need to call wrapAll in the windows that weren't closed. that's what the 3rd argument here is for. */
                aWindow === window
                    ? window.CustomizableUI.removeListener(cuiListen)
                    : aWindow.CustomizationHandler.isCustomizing() && wrapAll(domArray, inner);
            },
        };

        async function cuiArray() {
            /* get all the widgets in the nav-bar, filter out any nullish/falsy items, then call the big boy filter.
            if the global context is a private browsing window, then it will filter out any extension widgets that aren't allowed in private browsing.
            this is important because every item in the array needs to have a corresponding DOM node for us to remember the DOM order and place widgets where they belong.
            if we leave an item in the array that has no DOM node, then insertBefore will put the widget before undefined, which means put it at the very end, which isn't always what we want. */
            return CustomizableUI.getWidgetsInArea("nav-bar").filter(Boolean).filter(filterWidgets);
        }

        // allow the toolbar context menu to work correctly even though the toolbar buttons' parent is the slider, not the navbar customization target.
        window.sliderContextHandler = {
            /**
             * when the context menu is showing, we need to do things differently if it was called on a button inside the slider vs. a button outside of the slider.
             * @param {object} e (event => "popupshowing")
             * @returns (nothing)
             */
            handleEvent(e) {
                let popup = e.target;
                let button = this.validWidget(popup);
                let moveToPanel = popup.querySelector(".customize-context-moveToPanel");
                let removeFromToolbar = popup.querySelector(".customize-context-removeFromToolbar");
                if (!moveToPanel || !removeFromToolbar) return;
                // if the parent element is not the slider, then make the context menu work as normal and bail.
                if (!button || button.parentElement !== inner) {
                    moveToPanel.setAttribute(
                        "oncommand",
                        "gCustomizeMode.addToPanel(document.popupNode, 'toolbar-context-menu')"
                    );
                    removeFromToolbar.setAttribute(
                        "oncommand",
                        "gCustomizeMode.removeFromArea(document.popupNode, 'toolbar-context-menu')"
                    );
                    return;
                }

                this.popupNode = button;

                // if a non-removable system button got into the slider somehow, then disable these commands
                let movable = button && button.id && CustomizableUI.isWidgetRemovable(button);
                if (movable) {
                    if (CustomizableUI.isSpecialWidget(button.id))
                        moveToPanel.setAttribute("disabled", true);
                    else moveToPanel.removeAttribute("disabled");
                    removeFromToolbar.removeAttribute("disabled");
                } else {
                    moveToPanel.setAttribute("disabled", true);
                    removeFromToolbar.setAttribute("disabled", true);
                }

                // override the commands
                moveToPanel.setAttribute(
                    "oncommand",
                    "sliderContextHandler.addToPanel(sliderContextHandler.popupNode, 'toolbar-context-menu')"
                );
                removeFromToolbar.setAttribute(
                    "oncommand",
                    "sliderContextHandler.removeFromArea(sliderContextHandler.popupNode, 'toolbar-context-menu')"
                );
            },

            testClass(aNode) {
                return aNode.classList.contains("chromeclass-toolbar-additional");
            },

            validWidget(popup) {
                let node = popup.triggerNode;
                if (this.testClass(node)) return node;
                if (this.testClass(node.parentElement)) return node.parentElement;
                else return null;
            },

            /**
             * temporarily hide the button since CustomizableUI is slow. move the button out of the slider and onto the customization target.
             * @param {object} aNode (the button by which the context menu was triggered)
             */
            onBeforeCommand(aNode) {
                // if the node's already hidden, we don't want to interfere with any native methods.
                if (!aNode.hidden) {
                    aNode.style.visibility = "collapse";
                    aNode.hidingBeforeRemoval = true;
                }
                cTarget.appendChild(aNode); // the node must be moved to the customization target, since CustomizableUI expects widgets to be immediate children of a customization target.
                // the slider itself can't be a customization target, since you're not supposed to put a customizable area within a customizable area. I would like to figure out a way to do that some day though, since it would mean we could delete a LOT of the stuff in this script lol.
            },

            /**
             * "pin to overflow menu" => before calling the native method to move it to the overflow panel, hide it and move it to the customization target.
             * @param {object} aNode (the button by which the context menu was triggered)
             * @param {string} aReason (the ID for the context menu that sent the command)
             */
            async addToPanel(aNode, aReason) {
                this.onBeforeCommand(aNode);
                gCustomizeMode.addToPanel(aNode, aReason);
            },

            /**
             * "remove from toolbar" => same as above, but call the method to remove it instead.
             * @param {object} aNode (the button by which the context menu was triggered)
             * @param {string} aReason (the ID for the context menu that sent the command)
             */
            async removeFromArea(aNode, aReason) {
                this.onBeforeCommand(aNode);
                gCustomizeMode.removeFromArea(aNode, aReason);
            },

            attachListeners() {
                toolbarContextMenu.addEventListener("popupshowing", this, false);
            },
        };

        const muObserver = new MutationObserver(function (mus) {
            // mutation observer callback. we're listening for changes to the "open" attribute of children of inner (the inner container). when you click a toolbar button that has a popup, it opens the popup and sets the "open" attribute of the button to "true". if you were to scroll the slider container while the popup is open, the popup will move right along with its anchor, the button. this is a problem because some button popups are actually children of the button. meaning mousewheeling with the cursor over the popup would scroll the slider, not the popup. there are other ways to deal with this, but we don't want the slider to scroll at all when the popup is open. because firefox normally blocks scrolling when a menupopup is open. so let's just listen for button nodes having open="true" and set a property on the outer container accordingly. then we can use that prop to enable/disable scrolling.
            for (const mu of mus)
                if (mu.type === "attributes")
                    // if any button has open=true, set outer.open=true, else, outer.open=false.
                    kids.some((elem) => elem.open)
                        ? outer.open || (outer.open = true)
                        : !outer.open || (outer.open = false);
        });

        // convert the buttons we want to wrap into an array. isn't entirely necessary but it's a performant way to prevent weird anomalies during startup that could show up otherwise, e.g. after installing an update and restarting.
        async function convertToArray(buttons) {
            domArray = Array.from(buttons).filter((item, index, array) => {
                return array.indexOf(urlbar) < index && filterWidgets(item);
            });
            return domArray;
        }

        function filterWidgets(item) {
            // check if window is private and widget is disallowed in private browsing. if so, filter it out.
            if (item.showInPrivateBrowsing === false && PrivateBrowsingUtils.isWindowPrivate(this))
                return false;

            // exclude urlbar, searchbar, system buttons, and the slider itself.
            switch (item.id) {
                case "wrapper-back-button":
                case "back-button":
                case "wrapper-forward-button":
                case "forward-button":
                case "wrapper-stop-reload-button":
                case "stop-reload-button":
                case "wrapper-urlbar-container":
                case "urlbar-container":
                case "wrapper-search-container":
                case "search-container":
                case "urlbar-search-splitter":
                case "nav-bar-toolbarbutton-slider-container":
                    return false;
                default:
                    break;
            }
            // exclude spacing springs
            if (
                item.id.startsWith("customizableui-special-spring") ||
                item.id.startsWith("wrapper-customizableui-special-spring")
            )
                return !prefsvc.getBoolPref(springPref, true);
            let excludedButtons = JSON.parse(prefsvc.getStringPref(excludedPref, "[]"));
            if (excludedButtons.some((str) => str === item.id)) return false;
            return true;
        }

        function wrapAll(buttons, container, first = false) {
            let parent = buttons[0].parentElement;
            let previousSibling = buttons[0].previousSibling;
            appendLoop(buttons, container);
            // on first run put the inner container in the outer container
            if (first) outer.appendChild(container);
            /* we're inserting the container before the urlbar's next sibling, i.e. moving it to the original position of the first button.
            this way the container wraps the buttons "in place," wherever they happen to be.
            though for this reason, all the buttons you intend to collect should be consecutive, obviously.
            they don't need to be, but if they aren't, the slider may change the actual widget order, which persists through sessions. */
            parent.insertBefore(outer, previousSibling.nextSibling);
        }

        function unwrapAll(buttons, container) {
            appendLoop(buttons, container);
        }

        function backToNavbar(buttons, container) {
            buttons.forEach((val) => container.appendChild(val));
            cTarget.appendChild(outer);
        }

        // pick up any nodes that belong in the slider but aren't in it.
        async function pickUpOrphans(aNode) {
            let array = await cuiArray();
            array.forEach((item, i) => {
                /* check that the node which changed is in the customizable widgets list, since the ordering logic relies on the widgets list.
                we use forWindow when selecting nodes from the widgets list, since each widget has an instance for every window it's visible in.
                with multiple windows open, array[0] will return an object with a property "instances" whose value is an array of objects, each of which has a node property referencing the DOM node we actually want.
                forWindow is just a shortcut to get to the object corresponding to the context we're executing in. */
                if (item.id === aNode?.id)
                    /* if the node that changed is the last item in the array, meaning it's *supposed* to be the last in order, then we can't use insertBefore() since there's nothing meant to be after it. we can't only use after() either since it won't work for the first node. so we check for its intended position... */
                    i + 1 === array?.length
                        ? array[i - 1].forWindow(window).node.after(aNode) // and if it's the last item, we use the after() method to put it after the node corresponding to the previous widget.
                        : inner.insertBefore(aNode, array[i + 1].forWindow(window).node); // for all the other widgets we just insert their nodes before the node corresponding to the next widget.
            });
        }

        // only called during window startup. it's just here to pick up nodes that might have been created after convertToArray and wrapAll finished executing.
        function cleanUp() {
            if (outer.nextElementSibling) pickUpOrphans(outer.nextElementSibling);
        }

        async function slowCleanUp() {
            let array = await convertToArray(widgets);
            if (array.length) wrapAll(array, inner);
            reOrder();
        }

        /* like pickUpOrphans, but moves ALL nodes rather than only nodes which triggered onWidgetAfterDOMChange. we only use this once, after delayed startup.
        its only job is to check that the order of DOM nodes in the slider container matches the order of widgets in CustomizableUI. and if not, reorder it so that it does match. */
        async function reOrder() {
            let array = await cuiArray();
            // for every valid item in the widgets list...
            array.forEach((item, i) => {
                /* if the NODE's next sibling does not match the next WIDGET's node, then we need to move the node to where it belongs. basically the DOM order is supposed to match the widget array's order.
                an instance of widget 1 has a property 'node', let's call it node 1. same for widget 2, call it node 2.
                node 1's next sibling should be equal to node 2. if node 1's next sibling is actually node 5, then the DOM is out of order relative to the array.
                so we check each widget's node's next sibling, and if it's not equal to the node of the next widget in the array, we insert the node before the next widget's node. */
                if (
                    item.forWindow(window).node.nextElementSibling !=
                    array[i + 1]?.forWindow(window).node
                )
                    /* if nextElementSibling returns null, then it's the last child of the slider.
                    if that widget is the last in the array, then array[i+1] will return undefined.
                    since null == undefined the if statement will still execute for the last widget.
                    but the following expression says to insert the node before the next widget's node.
                    since there is no next widget, we're telling the engine to insert the node before undefined.
                    which always results in inserting the node at the end. so it ends up where it should be anyway.
                    and this is faster than actually checking if it's the last node for every iteration of the loop. */
                    inner.insertBefore(
                        item.forWindow(window)?.node,
                        array[i + 1]?.forWindow(window).node
                    );
            });
        }

        function setupScroll() {
            // element.children does not return an array, so doesn't have the some() method.
            kids.some = Array.prototype.some;
            // begin observing for changes to the "open" attribute of the slider's toolbar buttons.
            muObserver.observe(inner, { attributeFilter: ["open"], subtree: true });
            outer.className = "chromeclass-location slider-container";
            outer.id = "nav-bar-toolbarbutton-slider-container";
            // the crucial parts here are scroll-behavior: smooth, overflow: hidden. without this, smooth horizontal scrolling won't work.
            outer.style.cssText =
                "display: -moz-box; -moz-box-align: center; scrollbar-width: none; box-sizing: border-box; scroll-behavior: smooth; overflow: hidden; transition: max-width 0.2s ease-out;";
            outer.style.maxWidth = `${prefHandler.width}px`;
            outer.ready = true;
            inner.className = "slider-inner-container";
            inner.id = "nav-bar-toolbarbutton-slider";
            inner.style.cssText = "display: -moz-box; height: var(--urlbar-container-height);";
            for (const [key, val] of Object.entries({
                overflows: prefHandler.collapse,
                smoothscroll: true,
                clicktoscroll: true,
                orient: "horizontal",
            }))
                outer.setAttribute(key, val);
            outer.smoothScroll = true;
            outer._clickToScroll = true;
            outer._isScrolling = false;
            // these objects hold values used for scrolling
            outer._destination = 0;
            outer._direction = 0;
            outer._prevMouseScrolls = [null, null];

            // these are patterned after the arrowscrollbox functions.
            outer.scrollByPixels = function (aPixels, aInstant) {
                let scrollOptions = { behavior: aInstant ? "instant" : "auto" };
                scrollOptions.left = aPixels;
                this.scrollBy(scrollOptions);
            };

            // evaluate how much to scroll by in line deltaMode
            outer.lineScrollAmount = function () {
                return kids.length && this.scrollWidth / kids.length;
            };

            // these 2 are just here for future extension
            outer.on_Scroll = function () {
                if (this.open) return;
                this._isScrolling = true;
            };

            outer.on_Scrollend = function () {
                this._isScrolling = false;
                this._destination = 0;
                this._direction = 0;
            };

            // main wheel event callback
            outer.on_Wheel = function (event) {
                /* this is what the mutation observer was for. when a toolbar button in the slider has its popup open, we set outer.open = true.
                so if outer.open = true we don't want to scroll at all. in other words, if a popup for a button in the slider is open, don't do anything. */
                if (this.open) return;
                let doScroll = false;
                let instant;
                let scrollAmount = 0;
                let isVertical = Math.abs(event.deltaY) > Math.abs(event.deltaX); // check if the wheel event is mostly vertical (up/down) or mostly horizontal (left/right).
                let delta = isVertical // if we're scrolling vertically, then use the deltaY as the general delta. if horizontal, then use deltaX instead.
                    ? event.deltaY // you can use this to invert the vertical scrolling direction. just change event.deltaY to -event.deltaY.
                    : event.deltaX; // the tabbrowser has this reversed, at least for english. but in this implementation, wheelDown scrolls right, and wheelUp scrolls left.

                /* if we're using a trackpad or ball or something that can scroll horizontally and vertically at the same time, we need some extra logic.
                otherwise it can stutter like crazy. as you see in delta, we want to only use either the deltaY or the deltaX, never both.
                but if you're scrolling diagonally, that could change very quickly from X to Y to X and so on.
                so we want to only call scrollBy if the scroll input is consistent in one direction.
                that's what outer._prevMouseScrolls = [null, null] is for. we want to check that the last 2 scroll events were primarily vertical.
                if they were, then we'll enable scrolling and set the scroll amount. */
                if (this._prevMouseScrolls.every((prev) => prev == isVertical)) {
                    doScroll = true;
                    // check the delta mode to determine scrollAmount. depends on the device and settings. with a mousewheel it should usually use delta * lineScrollAmount
                    if (event.deltaMode == event.DOM_DELTA_PIXEL) {
                        scrollAmount = delta;
                        instant = true;
                    } else if (event.deltaMode == event.DOM_DELTA_PAGE)
                        scrollAmount = delta * this.clientWidth;
                    else scrollAmount = delta * this.lineScrollAmount();
                }

                /* we need to constantly update those 2 values in _prevMouseScrolls so that it won't scroll vertically for sudden axis changes.
                when an item gets added, it shoves the last item out of the array with shift().
                so the array only ever has 2 values, the isVertical value of the latest 2 events.
                so if i move the wheel horizontally once, then vertically once, this will be [true, false].
                and it won't allow vertical scrolling, since the every() method above checks that every member of the array is equal to isVertical.
                in other words, the last 2 scroll events need to be in the same direction or the events won't scroll the container.
                if i move vertically once more, it will be [true, true] and THEN the above block will be allowed to set doScroll and scrollAmount.
                if i move horizontally now, then it'll be [false, true] and vertical scrolling will be disabled again. */
                if (this._prevMouseScrolls.length > 1) this._prevMouseScrolls.shift(); // shift the last member out, before...
                this._prevMouseScrolls.push(isVertical); // adding the latest event's value to the array

                // provided we're allowed to scroll, then call scrollByPixels with the values previously returned.
                if (doScroll) {
                    let direction = scrollAmount < 0 ? -1 : 1;
                    let startPos = this.scrollLeft;

                    /* since we're using smooth scrolling, we check if the event is being sent while a scroll animation is already "playing."
                    this will avoid stuttering if scrolling quickly (or on a trackpad, methinks) */
                    if (!this._isScrolling || this._direction != direction) {
                        this._destination = startPos + scrollAmount;
                        this._direction = direction;
                    } else {
                        // We were already in the process of scrolling in this direction
                        this._destination = this._destination + scrollAmount;
                        scrollAmount = this._destination - startPos;
                    }
                    // finally do the actual scrolly thing
                    scrollAmount = scrollAmount * 0.4;
                    this.scrollByPixels(scrollAmount, instant);
                }

                event.stopPropagation();
                event.preventDefault();
            };

            /**
             * called when focusing a toolbar button with tab or arrow keys.
             * by default, this method calls elem.focus() which scrolls the button into view instantly.
             * we modify the function so that it checks if the button is contained inside a toolbar slider.
             * if it is, then we use a custom scroll function that 1) scrolls smoothly,
             * and 2) scrolls forward/backward such that the element ends up in the center of the scrollbar,
             * unless it's already scrolled to the end/beginning.
             * then it calls a special method that focuses without the native automatic instant scroll behavior.
             * @param {object} aButton (a button's DOM node)
             */
            ToolbarKeyboardNavigator._focusButton = function (aButton) {
                aButton.setAttribute("tabindex", "-1");
                let parent = aButton.parentElement;
                while (parent.tagName === "toolbarbutton" || parent.tagName === "toolbaritem")
                    parent = parent.parentElement;
                if (parent.classList.contains("slider-inner-container")) {
                    smoothCenterScrollTo(aButton, parent);
                    Services.focus.setFocus(aButton, Ci.nsIFocusManager.FLAG_NOSCROLL);
                } else aButton.focus();
                aButton.addEventListener("blur", this);
            };

            outer.addEventListener("wheel", outer.on_Wheel);
            outer.addEventListener("scroll", outer.on_Scroll);
            outer.addEventListener("scrollend", outer.on_Scrollend);
        }

        async function init() {
            prefHandler.initialSet();
            let array = await convertToArray(widgets); // wait for nodes to be filtered.
            wrapAll(array, inner, true); // first wrap call
            setupScroll();
            prefHandler.attachListeners();
            sliderContextHandler.attachListeners();
            cleanUp();
        }

        init();
        CustomizableUI.addListener(cuiListen);
        setTimeout(slowCleanUp, 1000);
    }

    // for this script we want to do everything as quickly as possible so there isn't a jarring transition during startup.
    if (gBrowserInit.delayedStartupFinished) startup();
    else {
        let delayedListener = (subject, topic) => {
            if (topic == "browser-delayed-startup-finished" && subject == window) {
                Services.obs.removeObserver(delayedListener, topic);
                startup();
            }
        };
        Services.obs.addObserver(delayedListener, "browser-delayed-startup-finished");
    }
})();


/**
 * favorite OnClick
 */
export const favoriteOnClick = async function (DBHelper, event) {
    const _this = event.target

    _this.disabled = true // disable the button
    const btnClassName = 'favorite-icon' // button class name
    const id = parseInt(_this.id.replace('fav-', '')); // get the id of restaurant

    // get current state (Boolean) from class name
    const currentState = _this.classList.contains(`${btnClassName}--on`) ? true : false;
    // get current state class name (String)
    const currentStateClass = currentState === true ? 'on' : 'off';

    // toggel favorite state localy for better user experience
    const newState = !currentState; // toggel favorite state
    const btnClassNameCurrentState = `${btnClassName}--${currentStateClass}`;
    const btnClassNameNewState = `${btnClassName}--${newState === true ? 'on' : 'off'}`;
    _this.classList.remove(btnClassNameCurrentState);
    _this.classList.add(btnClassNameNewState);
    _this.setAttribute('aria-checked', newState);
    
    try {
        const resData = await DBHelper.toggleFavoriteRestaurant(id, newState);

        // update favorite state if the new state does not applied
        if (resData.is_favorite.toString() !== newState.toString()) {
            // remove all classes
            _this.classList.remove(`${btnClassName}--on`, `${btnClassName}--off`);
            _this.classList.add(`${btnClassName}--${resData.is_favorite.toString() === 'true' ? 'on' : 'off'}`);
            _this.setAttribute('aria-checked', resData.is_favorite);
        }

        // Update Local Restaurant Data favorite state
        DBHelper.updateLocalRestaurantData(id, {
            is_favorite: resData.is_favorite
        })
    } catch (error) {
        console.log(error)
        // rollback
        _this.classList.remove(`${btnClassName}--on`, `${btnClassName}--off`);
        _this.classList.add(`${btnClassName}--${currentStateClass}`)
        _this.setAttribute('aria-checked', currentState);
    } finally {
        _this.disabled = false // re-enable the button
    }
};

/**
 * favorite Click Listener
 */
export const favoriteClickListener = (DBHelper, element = null) => {
    const elementListenTo = element !== null ? element : document.querySelector('.favorite-icon');
    elementListenTo.addEventListener('click', function (e) {
        if (e.target.classList.contains('favorite-icon'))
            favoriteOnClick(DBHelper, e);
    });
}

/**
 * show Main Content
 */
export function showMainContent() {
    document.getElementById('maincontent').classList.remove('visibility-hidden');
    document.getElementById('footer').classList.remove('fixed-bottom');
    document.querySelector('.loader-container').setAttribute('hidden', true);
}

/**
 * Get a parameter by name from page URL.
 */
export function getParameterByName(name, url) {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * childnode append Polyfill
 */
export function appendPolyfill() {
    // Source: https://github.com/jserz/js_piece/blob/master/DOM/ParentNode/append()/append().md
    return (function (arr) {
        arr.forEach(function (item) {
            if (item.hasOwnProperty('append')) {
                return;
            }
            Object.defineProperty(item, 'append', {
                configurable: true,
                enumerable: true,
                writable: true,
                value: function append() {
                    var argArr = Array.prototype.slice.call(arguments),
                        docFrag = document.createDocumentFragment();

                    argArr.forEach(function (argItem) {
                        var isNode = argItem instanceof Node;
                        docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
                    });

                    this.appendChild(docFrag);
                }
            });
        });
    })([Element.prototype, Document.prototype, DocumentFragment.prototype]);
}

/**
 * Polyfill ie 11 nodelist foreach
 */
export function polyfillIe11NodelistForeach() {
    if ('NodeList' in window && !NodeList.prototype.forEach) {
        console.info('polyfill for IE11');
        NodeList.prototype.forEach = function (callback, thisArg) {
            thisArg = thisArg || window;
            for (var i = 0; i < this.length; i++) {
                callback.call(thisArg, this[i], i, this);
            }
        };
    }
}

/**
 * About modal
 */
function aboutModal() {
    // Get the modal
    const modal = document.getElementById('about-modal');
    // Get the modal container
    const aboutModalContainer = document.getElementById('about-modal-container');
    // Get the button that opens the modal
    const btnOpen = document.getElementById('open-about-model');
    // Get the button that closes the modal
    const btnClose = document.getElementById('close-about-model');

    // Centralize about model according to window
    function centralizeAboutModel() {
        if (modal.style.display !== 'none') {
            const fullWidth = window.innerWidth;
            const containerWidth = aboutModalContainer.offsetWidth;
            const rightPos = (parseInt(fullWidth) - parseInt(containerWidth)) / 2;
            aboutModalContainer.style.right = `${rightPos}px`;
        }
    }

    function showModal() {
        modal.style.display = 'block';
        centralizeAboutModel();
    }

    // show modal fo first visite
    const firstVisite = localStorage.getItem('firstVisite');
    if (firstVisite === null) {
        localStorage.setItem('firstVisite', true);
        showModal();
    }
    

    // When the user clicks on the button, open the modal 
    btnOpen.onclick = function () {
        showModal();
    }

    // When the browser window resize and the modal is open
    // centralize it according to window new width
    window.onresize = function () {
        centralizeAboutModel();
    }

    // When the user clicks on [x], close the modal
    btnClose.onclick = function () {
        modal.style.display = 'none';
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

/**
 * Scroll to specific destination
 * src: https: //pawelgrzybek.com/page-scroll-in-vanilla-javascript/
 * @param {HTMLElement | Number} destination 
 * @param {Number} duration 
 * @param {String} easing 
 * @param {Function} callback 
 */
function scrollIt(destination, duration = 1000, easing = 'linear', callback) {

    const easings = {
        linear(t) {
            return t;
        },
        easeInQuad(t) {
            return t * t;
        },
        easeOutQuad(t) {
            return t * (2 - t);
        },
        easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        },
        easeInCubic(t) {
            return t * t * t;
        },
        easeOutCubic(t) {
            return (--t) * t * t + 1;
        },
        easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        },
        easeInQuart(t) {
            return t * t * t * t;
        },
        easeOutQuart(t) {
            return 1 - (--t) * t * t * t;
        },
        easeInOutQuart(t) {
            return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
        },
        easeInQuint(t) {
            return t * t * t * t * t;
        },
        easeOutQuint(t) {
            return 1 + (--t) * t * t * t * t;
        },
        easeInOutQuint(t) {
            return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t;
        }
    };

    const start = window.pageYOffset;
    const startTime = 'now' in window.performance ? performance.now() : new Date().getTime();

    const documentHeight = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
    const windowHeight = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
    const destinationOffset = typeof destination === 'number' ? destination : destination.offsetTop;
    const destinationOffsetToScroll = Math.round(documentHeight - destinationOffset < windowHeight ? documentHeight - windowHeight : destinationOffset);

    if ('requestAnimationFrame' in window === false) {
        window.scroll(0, destinationOffsetToScroll);
        if (callback) {
            callback();
        }
        return;
    }

    function scroll() {
        const now = 'now' in window.performance ? performance.now() : new Date().getTime();
        const time = Math.min(1, ((now - startTime) / duration));
        const timeFunction = easings[easing](time);
        window.scroll(0, Math.ceil((timeFunction * (destinationOffsetToScroll - start)) + start));

        if (window.pageYOffset === destinationOffsetToScroll) {
            if (callback) {
                callback();
            }
            return;
        }

        requestAnimationFrame(scroll);
    }

    scroll();
}

/**
 * Scroll to top
 */
function scrollToTop() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (scrollButton === null) return;

    scrollButton.addEventListener('click', () => scrollIt(0));
}

/**
 * Scroll to add review section
 */
function scrollToAddReview() {
    const scrollButton = document.querySelector('.scroll-to-add-review');
    const destination = document.getElementById('add-reviews-container');
    if (scrollButton === null || destination === null) return;

    scrollButton.addEventListener('click', () => scrollIt(destination.offsetTop - 140));
}

/**
 * Add the given text to the current document title.
 * @param {String} placehoder 
 * @param {String} text 
 */
export function addToDocTitle(text) {
    document.title = text + ' | ' + document.title;
}

/**
 * Auto invoked functions
 */
export default (function () {
    window.addEventListener('load', () => {
        aboutModal();
        scrollToTop();
        scrollToAddReview();
    })
})()
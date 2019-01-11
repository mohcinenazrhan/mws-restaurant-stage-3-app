/**
 * favorite OnClick
 */
export const favoriteOnClick = async function (DBHelper, event) {
    console.log(DBHelper, event);
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
export const favoriteClickListener = (DBHelper) => {
    const favoriteBtnList = document.getElementsByClassName('favorite-icon');
    Array.from(favoriteBtnList).forEach(function (favoriteBtn) {
        favoriteBtn.addEventListener('click', favoriteOnClick.bind(null, DBHelper));
    });
}

/**
 * show Main Content
 */
export function showMainContent() {
    document.getElementById('maincontent').classList.remove('visibility-hidden');
    document.getElementById('maincontent').classList.add('fadein');
    document.getElementById('footer').classList.remove('fixed-bottom');
    document.querySelector('.loader').setAttribute('hidden', true);
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
export default (function () {
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
})()
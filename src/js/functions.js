/**
 * favorite OnClick
 */
const favoriteOnClick = function () {
    this.disabled = true // disable the button
    const btnClassName = 'favorite-icon' // button class name
    const id = parseInt(this.id.replace('fav-', '')); // get the id of restaurant

    // get current state (Boolean) from class name
    const currentState = this.classList.contains(`${btnClassName}--on`) ? true : false;
    // get current state class name (String)
    const currentStateClass = currentState === true ? 'on' : 'off';

    // toggel favorite state localy for better user experience
    const newState = !currentState; // toggel favorite state
    const btnClassNameCurrentState = `${btnClassName}--${currentStateClass}`;
    const btnClassNameNewState = `${btnClassName}--${newState === true ? 'on' : 'off'}`;
    this.classList.replace(btnClassNameCurrentState, btnClassNameNewState);
    this.setAttribute('aria-checked', newState);

    // toggel favorite state on the server
    DBHelper.toggleFavoriteRestaurant(id, newState)
        .then((res) => {
            // update favorite state if the new state does not applied
            if (res.is_favorite.toString() !== newState.toString()) {
                // remove all classes
                this.classList.remove(`${btnClassName}--on`, `${btnClassName}--off`);
                this.classList.add(`${btnClassName}--${res.is_favorite.toString() === 'true' ? 'on' : 'off'}`);
                this.setAttribute('aria-checked', res.is_favorite);
            }
            
            // Update Local Restaurant Data favorite state
            DBHelper.updateLocalRestaurantData(id, {
                is_favorite: res.is_favorite
            })

            this.disabled = false // re-enable the button
        }).catch((error) => {
            console.log(error)
            // rollback
            this.classList.remove(`${btnClassName}--on`, `${btnClassName}--off`);
            this.classList.add(`${btnClassName}--${currentStateClass}`)
            this.setAttribute('aria-checked', currentState);
            this.disabled = false // re-enable the button
        })
};

/**
 * favorite Click Listener
 */
const favoriteClickListener = () => {
    const favoriteBtnList = document.getElementsByClassName('favorite-icon');
    Array.from(favoriteBtnList).forEach(function (favoriteBtn) {
        favoriteBtn.addEventListener('click', favoriteOnClick);
    });
}

/**
 * show Main Content
 */
function showMainContent() {
    document.getElementById('maincontent').classList.remove('visibility-hidden');
    document.getElementById('maincontent').classList.add('fadein');
    document.getElementById('footer').classList.remove('fixed-bottom');
    document.querySelector('.loader').setAttribute('hidden', true);
}

/**
 * Get a parameter by name from page URL.
 */
function getParameterByName (name, url) {
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
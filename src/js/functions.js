/**
 * favorite OnClick
 */
const favoriteOnClick = function () {
    this.disabled = true
    const classPrefix = 'favorite-icon'
    const id = parseInt(this.id.replace('fav-', ''));
    const currentState = this.classList.contains(`${classPrefix}--on`) ? true : false;
    const currentStateClass = this.classList.contains(`${classPrefix}--on`) ? 'on' : 'off';
    this.classList.remove(`${classPrefix}--${currentStateClass}`);
    this.classList.add(`${classPrefix}--${!currentState === true ? 'on' : 'off'}`);
    DBHelper.toggleFavoriteRestaurant(id, !currentState)
        .then((res) => {
            this.classList.remove(`${classPrefix}--${currentStateClass}`);
            this.classList.add(`${classPrefix}--${res.is_favorite.toString() === 'true' ? 'on' : 'off'}`);
            this.disabled = false
        }).catch((error) => {
            console.log(error)
            if (error === 'fallback') {
                this.disabled = false
            }
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
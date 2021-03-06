/* ======= Import modules ======= */
import * as funcsHelpers from './functions';
import DBHelper from './dbhelper';
import SWRegistration from './sw-registration';
import Notificationbtn from './Notificationbtn';
import lazySizes from 'lazysizes';
import 'whatwg-fetch';

/* ======= Model ======= */
let model = {
  restaurants: null,
  newMap: null,
  markers: [],
  swRegConfig: {}
};

/* ======= Controler ======= */
const controler = {
  init: function () {
    this.dbHelper = new DBHelper();
    this.initMap();
    view.init();
    lazySizes.init();
    
    funcsHelpers.appendPolyfill();
    
    // Fetch neighborhoods and cuisines as soon as the page is loaded.
    document.addEventListener('DOMContentLoaded', () => {
      this.fillContent();
      this.listenerOnFilterChange();
      this.swRegistration();
      // defer to optimise loading
      setTimeout(() => {
        Notificationbtn.create();
      }, 2000);
    });
  },
  /**
   * sw registration
   */
  swRegistration: async function () {
    try {
      await SWRegistration.fire(model.swRegConfig);
      this.listenerForSwMsg();
    } catch (error) {
      console.log(error);
    }
  },
  /**
  * update content automatically when receive message from service worker
  */
  listenerForSwMsg: function () {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data === 'updateContent') {
        await this.dbHelper.updateInmemoryRestaurantsData();
          this.fillContent();
          SWRegistration.showMsg('Content Updated');
      }
    });
  },
  fillContent: async function () {
    await this.updateRestaurants();

      funcsHelpers.showMainContent();
      this.fetchNeighborhoods();
      this.fetchCuisines();
      funcsHelpers.favoriteClickListener(this.dbHelper, view.restaurantsList);
  },
  /**
   * Listen for select elements and update Restaurants
   */
  listenerOnFilterChange: function () {
    document
      .querySelector('.filter-options')
      .addEventListener('change', e => {
        if (e.target.id.includes('-select')) {
          controler.updateRestaurants();
          e.stopPropagation();
        }
      });
  },
  /**
   * Fetch all neighborhoods and set their HTML.
   */
  fetchNeighborhoods: async function () {
    try {
      const neighborhoods = await this.dbHelper.fetchNeighborhoods();
      view.fillNeighborhoodsHTML(neighborhoods);
    } catch (error) {
      console.error(error);
    }
  },
  /**
   * Fetch all cuisines and set their HTML.
   */
  fetchCuisines: async function () {
    try {
      const cuisines = await this.dbHelper.fetchCuisines();
      view.fillCuisinesHTML(cuisines);
    } catch (error) {
      console.error(error);
    }
  },
  /**
   * Initialize leaflet map, called from HTML.
   */
  initMap: function () {
    if (typeof L !== 'undefined') {
      model.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });

      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: this.dbHelper.fetchMAPBOXToken(),
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(model.newMap);
    }
  },
  /**
   * Update page and map for current restaurants.
   */
  updateRestaurants: async function () {
    const cuisine = view.getSelectValue('cuisines');
    const neighborhood = view.getSelectValue('neighborhoods');
    
    try {
      const restaurants = await this.dbHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
      this.resetRestaurants(restaurants);
      if (restaurants.length === 0) {
        view.showNoRestaurantsMsg();
        return;
      }
      view.addMarkersToMap(restaurants);
      view.fillRestaurantsHTML(restaurants);
    } catch (error) {
      console.log(error);
    }
  },
  /**
   * Clear current restaurants, their HTML and remove their map markers.
   */
  resetRestaurants: function (restaurants) {
    // Remove all restaurants
    model.restaurants = [];
    // Remove all map markers
    if (model.markers) {
      model.markers.map((marker) => marker.remove());
    }
    model.markers = [];
    view.initContent();
    model.restaurants = restaurants;
  }
};

/* ======= View ======= */
const view = {
  init: function () {
    this.restaurantsList = document.getElementById('restaurants-list');
    this.cuisinesSelect = document.getElementById('cuisines-select');
    this.neighborhoodsSelect = document.getElementById('neighborhoods-select');
    this.noRestaurantsMsg = document.getElementById('no-restaurants-msg')
  },
  initContent: function () {
    this.restaurantsList.innerHTML = '';
    this.hideNoRestaurantsMsg();
  },
  getSelectValue: function (selectName) {
    if (selectName === 'cuisines') {
      return this.cuisinesSelect[this.cuisinesSelect.selectedIndex].value;
    } else if (selectName === 'neighborhoods') {
      return this.neighborhoodsSelect[this.neighborhoodsSelect.selectedIndex].value;
    }
  },
  showNoRestaurantsMsg: function () {
    this.noRestaurantsMsg.style.display = 'block';
  },
  hideNoRestaurantsMsg: function () {
    this.noRestaurantsMsg.style.display = 'none';
  },
  /**
   * Set neighborhoods HTML.
   */
  fillNeighborhoodsHTML: function (neighborhoods) {
    this.fillSelectOption(this.neighborhoodsSelect, 'Neighborhoods', neighborhoods);
  },
  /**
   * Set cuisines HTML.
   */
  fillCuisinesHTML: function (cuisines) {
    this.fillSelectOption(this.cuisinesSelect, 'Cuisines', cuisines);
  },
  /**
   * Fill select html element with given options
   * @param {HTMLElement} selectElement 
   * @param {String} name 
   * @param {Array} options 
   */
  fillSelectOption: function (selectElement, name, options) {
    const frag = document.createDocumentFragment();
    frag.appendChild(this.createOption(`All ${name}`, 'all'));

    options.map((option) => {
      frag.appendChild(this.createOption(option, option))
    });

    selectElement.innerHTML = '';
    selectElement.append(frag);
  },
  /**
   * Create option of select HTML element
   * @param {String} text
   * @param {String} value
   */
  createOption: function (text, value) {
    const option = document.createElement('option');
    option.innerHTML = text;
    option.value = value;
    return option;
  },
  /**
   * Create restaurant HTML.
   */
  createRestaurantHTML: function (restaurant) {
    const li = document.createElement('li');
    li.id = `listitem-${restaurant.id}`;
    li.className = 'fadein col-xs-12 col-sm-6 col-md-4 col-lg-3';

    const item = document.createElement('div');
    item.className = 'listitem';

    const ratioContainer = document.createElement('div');
    ratioContainer.className = 'ratio-container';

    const image = document.createElement('img');
    image.setAttribute('alt', restaurant.name);

    image.className = 'restaurant-img lazyload blur-up';
    image.setAttribute('data-src', controler.dbHelper.imageUrlForRestaurant(restaurant));
    image.setAttribute('data-srcset', controler.dbHelper.srcsetImageUrlForIndex(restaurant));
    image.setAttribute('data-sizes', 'auto');
    ratioContainer.append(image);

    const btnFavorite = document.createElement('button');
    const isFavorite = restaurant.is_favorite.toString() === 'true' ? true : false;
    btnFavorite.title = 'Favorite'
    btnFavorite.setAttribute('tabindex', '0');
    btnFavorite.setAttribute('aria-label', 'favorite restaurant');
    btnFavorite.setAttribute('role', 'switch');
    btnFavorite.setAttribute('aria-checked', isFavorite);
    btnFavorite.setAttribute('id', `fav-${restaurant.id}`);
    btnFavorite.classList.add('favorite-icon');
    btnFavorite.classList.add(`favorite-icon--${isFavorite ? 'on' : 'off'}`);
    ratioContainer.append(btnFavorite);

    item.append(ratioContainer)

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';

    const name = document.createElement('h3');
    name.setAttribute('id', `res-${restaurant.id}`);
    name.innerHTML = restaurant.name;
    contentWrapper.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    contentWrapper.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    contentWrapper.append(address);

    const more = document.createElement('a');
    more.innerHTML = 'View Details';
    more.setAttribute('aria-labelledby', `res-${restaurant.id}`);
    more.href = controler.dbHelper.urlForRestaurant(restaurant);
    contentWrapper.append(more);

    item.append(contentWrapper);
    li.append(item);

    return li;
  },
  /**
   * Create all restaurants HTML and add them to the webpage.
   */
  fillRestaurantsHTML: function (restaurants) {
    
    const items = this.restaurantsList.getElementsByTagName('li');
    if (items.length > 1) {
      const restaurantsIds = restaurants.map((res) => res.id);
      
      for (let i = 0; i < items.length; ++i) {
        const id = items[i].id.replace('listitem-', '');
        if (restaurantsIds.includes(parseInt(id))) {
          items[i].classList.remove('fadeout', 'hide');
          items[i].classList.add('fadein');
        } else {
          items[i].classList.remove('fadein');
          items[i].classList.add('fadeout');
          setTimeout(() => {
            items[i].classList.add('hide');
          }, 500);
        }
      }

      return;
    }

    const frag = document.createDocumentFragment();
    restaurants.map((restaurant) => {
      frag.appendChild(this.createRestaurantHTML(restaurant))
    });
    this.restaurantsList.append(frag);
  },
  /**
   * Add markers for current restaurants to the map.
   */
  addMarkersToMap: function (restaurants) {
    if (typeof L !== 'undefined') {

      if (model.markers.length > 0) {
        const restaurantsListIds = restaurants.map(res => `marker-${res.id}`);
        model.markers.map((marker) => {
          if (!restaurantsListIds.includes(marker.options.id)) marker.remove()
          else marker.addTo(model.newMap)
        });
        return
      }

      restaurants.map((restaurant) => {
        // Add marker to the map
        const marker = controler.dbHelper.mapMarkerForRestaurant(restaurant, model.newMap);
        marker.on('click', onClick);

        function onClick() {
          window.location.href = marker.options.url;
        }

        model.markers.push(marker);
      });
    }
  }
};

/* ======= Fire ======= */
controler.init();
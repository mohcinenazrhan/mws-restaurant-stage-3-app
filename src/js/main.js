/* ======= Import modules ======= */
import * as funcsHelpers from './functions';
import './sw-registration';
import DBHelper from './dbhelper';
import SWRegistration from './sw-registration';

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
    SWRegistration.fire(model.swRegConfig)
                  .then(() => {
                    this.listenerForSwMsg();
                  });

    this.dbHelper = new DBHelper();
    this.initMap();
    view.init();
                  
    funcsHelpers.appendPolyfill();
    
    // Fetch neighborhoods and cuisines as soon as the page is loaded.
    document.addEventListener('DOMContentLoaded', () => {
      this.fillContent()
    });
  },
  /**
  * update content automatically when receive message from service worker
  */
  listenerForSwMsg: function () {
    
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data === 'updateContent') {
        console.log('updateContent');
        this.dbHelper.updateInmemoryRestaurantsData()
          .then(() => {
            this.fillContent()
            SWRegistration.showMsg('Content Updated')
          })
      }
    });
  },
  fillContent: function () {
    this.updateRestaurants()
      .then(() => {
        this.fetchNeighborhoods();
        this.fetchCuisines();
        this.listenerOnFilterChange();
        funcsHelpers.showMainContent();
        funcsHelpers.favoriteClickListener(this.dbHelper);
      })
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
  fetchNeighborhoods: function () {
    this.dbHelper.fetchNeighborhoods().then((neighborhoods) => {
      view.fillNeighborhoodsHTML(neighborhoods);
    }).catch((error) => {
      console.error(error);
    })
  },
  /**
   * Fetch all cuisines and set their HTML.
   */
  fetchCuisines: function () {
    this.dbHelper.fetchCuisines().then((cuisines) => {
      view.fillCuisinesHTML(cuisines);
    }).catch((error) => {
      console.error(error);
    })
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
  updateRestaurants: function () {
    const cuisine = view.getSelectValue('cuisines');
    const neighborhood = view.getSelectValue('neighborhoods');
    
    return this.dbHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
      .then((restaurants) => {
        this.resetRestaurants(restaurants);
        view.fillRestaurantsHTML(restaurants);
        view.addMarkersToMap(restaurants);
      }).catch((error) => {
        console.log(error);
      })
  },
  /**
   * Clear current restaurants, their HTML and remove their map markers.
   */
  resetRestaurants: function (restaurants) {
    // Remove all restaurants
    model.restaurants = [];
    // Remove all map markers
    if (model.markers) {
      model.markers.forEach(marker => marker.remove());
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
  },
  initContent: function () {
    this.restaurantsList.innerHTML = '';
  },
  getSelectValue: function (selectName) {
    if (selectName === 'cuisines') {
      return this.cuisinesSelect[this.cuisinesSelect.selectedIndex].value;
    } else if (selectName === 'neighborhoods') {
      return this.neighborhoodsSelect[this.neighborhoodsSelect.selectedIndex].value;
    }
  },
  /**
   * Set neighborhoods HTML.
   */
  fillNeighborhoodsHTML: function (neighborhoods) {
    neighborhoods.forEach(neighborhood => {
      const option = document.createElement('option');
      option.innerHTML = neighborhood;
      option.value = neighborhood;
      this.neighborhoodsSelect.append(option);
    });
  },
  /**
   * Set cuisines HTML.
   */
  fillCuisinesHTML: function (cuisines) {
    cuisines.forEach(cuisine => {
      const option = document.createElement('option');
      option.innerHTML = cuisine;
      option.value = cuisine;
      this.cuisinesSelect.append(option);
    });
  },
  /**
   * Create restaurant HTML.
   */
  createRestaurantHTML: function (restaurant) {
    const li = document.createElement('li');
    li.id = `listitem-${restaurant.id}`;
    li.className = 'fadein';

    const item = document.createElement('div');
    item.className = 'listitem';

    const image = document.createElement('img');
    image.setAttribute('alt', restaurant.name);

    image.className = 'restaurant-img';
    image.src = controler.dbHelper.imageUrlForRestaurant(restaurant);
    image.srcset = controler.dbHelper.srcsetImageUrlForIndex(restaurant);
    item.append(image);

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
    item.append(btnFavorite);

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
    
    const resElementList = view.restaurantsList.getElementsByTagName('li')
    if (resElementList.length > 1) {
      const restaurantsListIds = restaurants.map(res => `listitem-${res.id}`);
      for (let item of resElementList) {
        if (restaurantsListIds.includes(item.id)) item.className = 'fadein'
        else item.className = 'fadeout'
      }
      
      return;
    }

    restaurants.forEach(restaurant => {
      this.restaurantsList.append(this.createRestaurantHTML(restaurant));
    });
  },
  /**
   * Add markers for current restaurants to the map.
   */
  addMarkersToMap: function (restaurants) {
    if (typeof L !== 'undefined') {

      if (model.markers.length > 0) {
        const restaurantsListIds = restaurants.map(res => `marker-${res.id}`);
        model.markers.forEach(marker => {
          if (!restaurantsListIds.includes(marker.options.id)) marker.remove()
          else marker.addTo(model.newMap)
        });
        return
      }

      restaurants.forEach(restaurant => {
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
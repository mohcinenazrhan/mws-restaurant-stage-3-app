/* ======= Model ======= */
let model = {
  restaurants: null,
  newMap: null,
  markers: []
};


/* ======= Controler ======= */

const controler = {

  init: function () {
    this.initMap();

    // Fetch neighborhoods and cuisines as soon as the page is loaded.
    document.addEventListener('DOMContentLoaded', () => {
      this.updateRestaurants()
          .then(() => {
            this.fetchNeighborhoods();
            this.fetchCuisines();
            this.listenerOnFilterChange();
            showMainContent();
            favoriteClickListener();
          })
    });
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
    DBHelper.fetchNeighborhoods().then((neighborhoods) => {
      view.fillNeighborhoodsHTML(neighborhoods);
    }).catch((error) => {
      console.error(error);
    })
  },
  /**
   * Fetch all cuisines and set their HTML.
   */
  fetchCuisines: function () {
    DBHelper.fetchCuisines().then((cuisines) => {
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
        mapboxToken: DBHelper.fetchMAPBOXToken(),
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
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    return DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
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
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';
    // Remove all map markers
    if (model.markers) {
      model.markers.forEach(marker => marker.remove());
    }
    model.markers = [];
    model.restaurants = restaurants;
  }
};

/* ======= View ======= */
const view = {

  init: function () {
  },
  /**
   * Set neighborhoods HTML.
   */
  fillNeighborhoodsHTML: function (neighborhoods) {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
      const option = document.createElement('option');
      option.innerHTML = neighborhood;
      option.value = neighborhood;
      select.append(option);
    });
  },
  /**
   * Set cuisines HTML.
   */
  fillCuisinesHTML: function (cuisines) {
    const select = document.getElementById('cuisines-select');
    cuisines.forEach(cuisine => {
      const option = document.createElement('option');
      option.innerHTML = cuisine;
      option.value = cuisine;
      select.append(option);
    });
  },
  /**
   * Create restaurant HTML.
   */
  createRestaurantHTML: function (restaurant) {
    const li = document.createElement('li');

    const item = document.createElement('div');
    item.className = 'listitem';

    const image = document.createElement('img');
    image.setAttribute('alt', restaurant.name);

    image.className = 'restaurant-img';
    image.src = DBHelper.imageUrlForRestaurant(restaurant);
    image.srcset = DBHelper.srcsetImageUrlForIndex(restaurant);
    item.append(image);

    const btnFavorite = document.createElement('button');
    btnFavorite.title = 'Favorite'
    btnFavorite.setAttribute('id', `fav-${restaurant.id}`);
    btnFavorite.classList.add('favorite-icon');
    btnFavorite.classList.add(`favorite-icon--${restaurant.is_favorite.toString() === 'true' ? 'on' : 'off'}`);
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
    more.href = DBHelper.urlForRestaurant(restaurant);
    contentWrapper.append(more);

    item.append(contentWrapper);
    li.append(item);

    return li;
  },
  /**
   * Create all restaurants HTML and add them to the webpage.
   */
  fillRestaurantsHTML: function (restaurants) {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
      ul.append(this.createRestaurantHTML(restaurant));
    });
  },
  /**
   * Add markers for current restaurants to the map.
   */
  addMarkersToMap: function (restaurants) {
    if (typeof L !== 'undefined') {
      restaurants.forEach(restaurant => {
        // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, model.newMap);
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
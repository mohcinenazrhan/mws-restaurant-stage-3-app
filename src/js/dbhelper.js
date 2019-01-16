import tokens from '../../tokens';
import IDBHelper from './idbHelper';

/**
 * Common database helper functions.
 */

class DBHelper {

  constructor () {
    this.idbHelper = new IDBHelper();
    // To get the data from network one time
    this.fetchRestaurantsData = null;
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  getDbUrl(params = '') {
    const API_ORIGIN = '<<-APIORIGIN->>'; // injected by gulp
    return `${API_ORIGIN}/${params}`;
  }

  /**
   * get MAPBOX Token from tokens.js
   * TODO: fetch it from db
   */
  fetchMAPBOXToken() {
    return tokens.MAPBOX_TOKEN;
  }

  /**
   * fetch the given endpoint with options 
   * return value of json response promise 
   * @param {*} endPoint 
   * @param {*} options 
   */
  async fetchAndGetJsonData(endpoint, options = {}) {
    try {
      const promiseResponse = await fetch(endpoint, options);
      const statusListForJson = [200, 201, 302];

      if (statusListForJson.includes(promiseResponse.status)) {

        let data = null;
        const promiseResponseJson = promiseResponse.json();
        await promiseResponseJson.then((promiseData) => {
          data = promiseData
        });
        return data;

      } else {
        throw promiseResponse.status;
      }

    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Fetch all restaurants.
   */
  async fetchRestaurants() {
    try {
      // return In-memory Restaurants Data if not null
      if (this.fetchRestaurantsData) return this.fetchRestaurantsData;

      // Get value (json) from fetch response 
      const restaurants = await this.fetchAndGetJsonData(this.getDbUrl('restaurants'));

      // save the promise resolved to serve it for future call
      // to get the response from NET. just one time for better performance
      this.fetchRestaurantsData = restaurants;

      // Save Data To Local Db (client side persistent data)
      // Save Data if empty (first visit) without await SW to do that in the second visit
      // To give user a better UX
      this.idbHelper.saveDataToIdb(restaurants, 'restaurants');
      
      // return data as objects 
      return restaurants;

    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * update In-memory Restaurants Data.
   */
  async updateInmemoryRestaurantsData() {
    try {
      // Get value (json) from fetch response 
      const restaurants = await this.fetchAndGetJsonData(this.getDbUrl('restaurants'));

      // save the promise resolved to serve it for future call
      // to get the response from NET. just one time for better performance
      this.fetchRestaurantsData = restaurants;

      // return data as objects
      return restaurants;

    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  async fetchRestaurantById(id) {
    try {
      // Get value (json) from fetch response 
      const restaurant = await this.fetchAndGetJsonData(this.getDbUrl(`restaurants/${id}`));

      // Save Data To Local Db (client side persistent data)
      // Save Data if empty (first visit) without await SW to do that in the second visit
      // To give user a better UX
      this.idbHelper.saveDataToIdb(restaurant, 'restaurants');

      // return data as objects
      return restaurant;

    } catch (status) {
      if (status === 404) return Promise.reject('No restaurant found');
      return Promise.reject(status);
    }
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  async fetchRestaurantByCuisine(cuisine) {
    try {
      // Fetch all restaurants
      let restaurants = await this.fetchRestaurants();

      // Filter restaurants to have only given cuisine type
      return restaurants.filter(r => r.cuisine_type == cuisine);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  async fetchRestaurantByNeighborhood(neighborhood) {
    try {
      // Fetch all restaurants
      let restaurants = await this.fetchRestaurants();

      // Filter restaurants to have only given neighborhood
      return restaurants.filter(r => r.neighborhood == neighborhood);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  async fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    try {
      // Fetch all restaurants
      let restaurants = await this.fetchRestaurants();
      
      if (cuisine != 'all') { // filter by cuisine
        restaurants = restaurants.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        restaurants = restaurants.filter(r => r.neighborhood == neighborhood);
      }

      return restaurants;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   * return result object not promise
   */
  async fetchNeighborhoods() {
    try {
      // Fetch all restaurants
      const restaurants = await this.fetchRestaurants();

      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      return neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  async fetchCuisines() {
    try {
      // Fetch all restaurants
      const restaurants = await this.fetchRestaurants();
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      // Remove duplicates from cuisines
      return cuisines.filter((v, i) => cuisines.indexOf(v) == i);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Restaurant page URL.
   */
  urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * srcset Image Url For Restaurant.
   */
  srcsetImageUrlForRestaurant(restaurant) {
    return restaurant.srcset_restaurant;
  }

  /**
   * srcset Image Url For Index.
   */
  srcsetImageUrlForIndex(restaurant) {
    return restaurant.srcset_index;
  }

  /**
   * Map marker for a restaurant.
   */
   mapMarkerForRestaurant(restaurant, newMap) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: `Localisation of ${restaurant.name} restaurant`,
      url: this.urlForRestaurant(restaurant),
      id: `marker-${restaurant.id}`
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: this.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  /**
   * Fetch reviews by restaurant ID.
   */
  async fetchReviewsByRestaurantId(id) {
    try {
      // Get value (json) from fetch response 
      const reviews = await this.fetchAndGetJsonData(this.getDbUrl(`reviews/?restaurant_id=${id}`));

      // Save Data To Local Db (client side persistent data)
      // Save Data if empty (first visit) without await SW to do that in the second visit
      // To give user a better UX
      this.idbHelper.saveDataToIdb(reviews, 'reviews');

      // return data as objects
      return reviews;

    } catch (status) {
      if (status === 404) return Promise.reject('No reviews found');
      return Promise.reject(status);
    }
  }

  /**
   * update Local RestaurantData
   * @param {Number} id 
   * @param {Object} newRestaurant 
   */
  updateLocalRestaurantData(id, newRestaurant) {
    // to make this process only in the main page
    if (this.fetchRestaurantsData === null) return

    return this.fetchRestaurantsData = this.fetchRestaurantsData.map((restaurant) => {
      if (restaurant.id === id) {
        return Object.assign(restaurant, newRestaurant)
      }

      return restaurant
    });
  }

  /**
   * 
   * @param {Number} id 
   * @param {Boolean} newState
   */
  async toggleFavoriteRestaurant(id, newState) {
    try {
      const options = {
        method: 'PUT',
        body: JSON.stringify({
          is_favorite: newState
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      }

      // Get value (json) from fetch response 
      return await this.fetchAndGetJsonData(this.getDbUrl(`restaurants/${id}/`), options);
    } catch (error) {
      // console.log('Request failed', error);
      return Promise.reject('rollback');
    }
  }

  async postReview(additionOptions) {
    try {
      const options = Object.assign({}, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, additionOptions)

      // Get value (json) from fetch response 
      return await this.fetchAndGetJsonData(this.getDbUrl('reviews/'), options);
    } catch (error) {
      return Promise.reject(error);
    }
  }

}

export default DBHelper;
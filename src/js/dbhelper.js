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
    const API_ORIGIN = 'APIORIGIN'; // injected by gulp
    return `${API_ORIGIN}/${params}`;
  }

  /**
   * get MAPBOX Token from tokens.js
   * TODO: fetch it from db
   */
  fetchMAPBOXToken() {
    return atob(tokens.MAPBOX_TOKEN)
  }

  /**
   * Fetch all restaurants.
   */
  fetchRestaurants () {
    
    return this.fetchRestaurantsData || fetch(this.getDbUrl('restaurants'))
      .then((response) => response.json())
      .then((restaurants) => {
          this.idbHelper.saveDataToIdb(restaurants, 'restaurants')
          this.fetchRestaurantsData = Promise.resolve(restaurants)
          return restaurants
      })
      .catch((error) => {
        console.log(error);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return this.fetchRestaurants()
                   .then((restaurants) => restaurants.find(r => r.id == id))
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  fetchRestaurantByCuisine(cuisine) {
    // Fetch all restaurants  with proper error handling
    return this.fetchRestaurants().then((restaurants) => {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        return results;
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  fetchRestaurantByNeighborhood(neighborhood) {
    // Fetch all restaurants
    return this.fetchRestaurants().then((restaurants) => {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        return results;
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return this.fetchRestaurants().then((restaurants) => {
      let results = restaurants
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      return results
    })
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  fetchNeighborhoods() {
    // Fetch all restaurants
    return this.fetchRestaurants().then((restaurants) => {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        return uniqueNeighborhoods;
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  fetchCuisines() {
    // Fetch all restaurants
    return this.fetchRestaurants().then((restaurants) => {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        return uniqueCuisines;
    });
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
  fetchReviewsByRestaurantId(id) {
    return fetch(this.getDbUrl(`reviews/?restaurant_id=${id}`))
      .then((response) => response.json())
      .then((reviews) => {
        reviews = reviews.filter(r => r.restaurant_id == id)
        this.idbHelper.saveDataToIdb(reviews, 'reviews')
        return reviews
      })
      .catch((error) => {
        console.log(error);
      });
  }


  /**
   * update Local RestaurantData
   * @param {Number} id 
   * @param {Object} newRestaurant 
   */
  updateLocalRestaurantData(id, newRestaurant) {
    return this.fetchRestaurantsData
            .then((res) => {
              return res.map((restaurant) => {
                if (restaurant.id === id) {
                  return Object.assign(restaurant, newRestaurant)
                }
                  
                return restaurant
              })
            })
            .then((newRestaurantsData) => {
              this.fetchRestaurantsData = Promise.resolve(newRestaurantsData)
              return;
            })
  }

  /**
   * 
   * @param {Number} id 
   * @param {Boolean} newState
   */
  toggleFavoriteRestaurant(id, newState) {
    return fetch(this.getDbUrl(`restaurants/${id}/`), {
        method: 'PUT',
        body: JSON.stringify({is_favorite: newState}),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then((res) => res.json())
      .catch((error) => {
        console.log('Request failed', error)
        return Promise.reject('rollback')
      })
  }

}

export default DBHelper;
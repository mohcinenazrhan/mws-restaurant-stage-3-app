// To get the data from network one time
let fetchRestaurantsData = null;
/**
 * Common database helper functions.
 */
class DBHelper {
  
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static getDbUrl(params = '') {
    /**
     * Local Mode
     */
    const API_ORIGIN = 'APIORIGIN';
    return `${API_ORIGIN}/${params}`;
  }

  /**
   * get MAPBOX Token from tokens.js
   * TODO: fetch it from db
   */
  static fetchMAPBOXToken() {
    return atob(tokens.MAPBOX_TOKEN)
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants () {
    
    return fetchRestaurantsData || fetch(DBHelper.getDbUrl('restaurants'))
      .then((response) => response.json())
      .then((restaurants) => {
          fetchRestaurantsData = Promise.resolve(restaurants)
          return restaurants
      })
      .catch((error) => {
        console.log(error);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return DBHelper.fetchRestaurants()
                   .then((restaurants) => restaurants.find(r => r.id == id))
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine) {
    // Fetch all restaurants  with proper error handling
    return DBHelper.fetchRestaurants().then((restaurants) => {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        return results;
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants().then((restaurants) => {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        return results;
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants().then((restaurants) => {
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
  static fetchNeighborhoods() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants().then((restaurants) => {
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
  static fetchCuisines() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants().then((restaurants) => {
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
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * srcset Image Url For Restaurant.
   */
  static srcsetImageUrlForRestaurant(restaurant) {
    return restaurant.srcset_restaurant;
  }

  /**
   * srcset Image Url For Index.
   */
  static srcsetImageUrlForIndex(restaurant) {
    return restaurant.srcset_index;
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, newMap) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: `Localisation of ${restaurant.name} restaurant`,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  /**
   * Fetch reviews by restaurant ID.
   */
  static fetchReviewsByRestaurantId(id) {
    return fetch(DBHelper.getDbUrl(`reviews/?restaurant_id=${id}`))
      .then((response) => response.json())
      .then((reviews) => reviews.filter(r => r.restaurant_id == id))
      .catch((error) => {
        console.log(error);
      });
  }


  /**
   * update Local RestaurantData
   * @param {Number} id 
   * @param {Object} newRestaurant 
   */
  static updateLocalRestaurantData(id, newRestaurant) {
    return fetchRestaurantsData
            .then((res) => {
              return res.map((restaurant) => {
                if (restaurant.id === id) {
                  return Object.assign(restaurant, newRestaurant)
                }
                  
                return restaurant
              })
            })
            .then((newRestaurantsData) => {
              fetchRestaurantsData = Promise.resolve(newRestaurantsData)
              return;
            })
  }

  /**
   * 
   * @param {Number} id 
   * @param {Boolean} newState
   */
  static toggleFavoriteRestaurant(id, newState) {
    DBHelper.updateLocalRestaurantData(id, {
      is_favorite: newState
    })

    return fetch(DBHelper.getDbUrl(`restaurants/${id}/`), {
        method: 'PUT',
        body: JSON.stringify({is_favorite: newState}),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then((res) => {
        if (res.status === 302) throw 'fallback'
        else if (res.status === 200 || res.status === 304) return res.json()
      })
      .catch((error) => {
        console.log('Request failed', error)
        return Promise.reject(error)
      })
  }

}
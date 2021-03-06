window.onload = function() {

  // Game start button listeners
  var onePlayerButton = document.getElementById('start-1p');
  onePlayerButton.addEventListener( 'click' , Game.startGame , false );
  var twoPlayerButton = document.getElementById('start-2p');
  twoPlayerButton.addEventListener( 'click' , Game.startGame , false );

  Game.fadeInContainer();

}

// Global Game variables
var Game = {};
Game.score = -1;
Game.currentActor = '';
Game.moviesUsed = [];
Game.twoPlayer = false;
Game.currentPlayer = 1; // Increment on each turn. Player 1 is odd, Player 2 even
Game.playerOneScore = -1;
Game.playerTwoScore = 0;
Game.difficulty = 'easy';
Game.container = document.getElementById('movie-container');

// Fade in container on load
Game.fadeInContainer = function() {
  $('#movie-container').hide();
  $('#movie-container').velocity(
    {opacity: 1} , { // Velocity options
      display: 'block',
      duration: 600,
      complete: function() {
        var search = document.getElementById('movie-search');
        if(search != null) { // Focus on search input if it is on the page
          search.focus();
        }
        var encouragement = document.getElementById('encouragement');
        if (encouragement != null ) {
          $('#encouragement').velocity('callout.pulse');
        }
      }
    }
  );
}

// Start 1 or 2-player game with requested difficuty lvel
Game.startGame = function(e) {
  if( e.target.id == 'start-2p' ) {
    Game.twoPlayer = true;
  }
  // Set difficulty level
  var radios = document.getElementsByName('difficulty');
  for (var i = 0, length = radios.length; i < length; i++) {
    if (radios[i].checked) {
      Game.difficulty = radios[i].value;
      break;
    }
  }
  Game.container.innerHTML = ''; // Remove current content
  var heading = document.createElement('h1');
  heading.innerHTML = 'Give me any movie to get started.';
  if( Game.twoPlayer ) {
    heading.innerHTML = '<strong class="white-text">Player 1:</strong> ' + heading.innerHTML;
  }
  Game.container.appendChild(heading);
  var text = document.createElement('p');
  text.className = 'lead';
  text.innerHTML = 'Pro tip: it helps if you&rsquo;re familiar with the cast.';
  Game.container.appendChild(text);
  movieInput = Game.makeSearchInput();
  Game.container.appendChild(movieInput);
  Game.fadeInContainer();
} // End of startGame

// Reset Game variables to start game over
Game.resetGame = function() {
  Game.score = -1;
  Game.currentActor = '';
  Game.moviesUsed = [];
  Game.currentPlayer = 1;
  Game.playerOneScore = -1;
  Game.playerTwoScore = 0;
}

// Check cast of given movie for required actor
Game.checkActors = function(actors) {
  for( i in actors ) {
    if( Game.currentActor == actors[i] ) {
      return true;
    }
  }
  return false;
} // End of checkActors

// Make input element for searching movies
Game.makeSearchInput = function() {
  var movieInput = document.createElement('input');
  movieInput.id = "movie-search";
  movieInput.type = 'text';
  movieInput.placeholder = 'Enter your movie here.';
  movieInput.addEventListener( 'keyup' , Game.searchMovies , false );
  return movieInput;
}

// Query OMDB and get list of movies matching search
Game.searchMovies = function(e) {
  if( e.keyCode === 13 ) {
    var query = e.target.value;
    var movieQuery = {
      url: '/movie',
      type: 'GET',
      data: {
        searchType: 'list',
        s: query
      },
      dataType: 'json',
      success: function(data) {
        if( data.hasOwnProperty('Search') ) {
          // Fetch movie directly if only one result comes back
          if( data.Search.length == 1 ) {
            var movieID = data.Search[0].imdbID;
            Game.getMovie(movieID);
          } else {
            // Show movie list if more than one result comes back
            var movieList = new MovieList(data);
            Game.fadeInContainer();
          }
        } else {
          var notFoundError = new Error( Errors.notFound );
          notFoundError.initialize();
          notFoundError.render();
        }
      },
      error: function(data) {
        var notFoundError = new Error( Errors.notFound );
        notFoundError.initialize();
        notFoundError.render();
      }
    }
    $.ajax(movieQuery);
  }
} // End of searchMovies

// Capture input, query OMBD, respond accordingly
Game.getMovie = function(e) {
  // Get id from div if movie is clicked
  if( typeof(e) == 'object' ) {
    var query = e.srcElement.parentNode.id;
  }
  // Get id from variable if direct search
  else {
    var query = e;
  }
  var movieQuery = {
    url: '/movie',
    type: 'GET',
    data: {
      searchType: 'single',
      i: query, // Find movie by IMDB id
    },
    dataType: 'json',
    success: function(data) {
      if( data.Response == 'True' ) {
        var title = data.Title;
        for( i in Game.moviesUsed ) {
          if ( data.Title == Game.moviesUsed[i] ) {
            var sameMovieError = new Error( Errors.sameMovie );
            sameMovieError.initialize();
            sameMovieError.render();
            return;
          }
        }
        var newActors = data.Actors.split( ', ' );
        var isCorrect = true;
        if( (!Game.twoPlayer && Game.score > -1) || (Game.twoPlayer && Game.playerOneScore > -1 ) ) {
          isCorrect = Game.checkActors(newActors);
        }
        if( isCorrect ) {
          Game.moviesUsed.push(Game.playerOneScore, title );
          if( !Game.twoPlayer ) { // increment score for one player
            Game.score++;
          }
          else if ( Game.currentPlayer % 2 != 0 ) {
            Game.playerOneScore++;
          }
          else {
            Game.playerTwoScore++;
          }
          Game.currentPlayer++; // Switch players
          var movie = new Movie( data , isCorrect ); // Display new movie
          movie.initialize();
          movie.render();
          Game.fadeInContainer();
        }
        else {
          var movie = new Movie( data , isCorrect );
          movie.initialize();
          movie.render();
        }
      }
      else {
        var noMovieError = new Error( Game.noMovie );
        notFoundError.initialize();
        notFoundError.render();
      }
    },
    error: function(data) {
      var connectionError = new Error( Errors.badConnection );
      connectionError.initialize();
      connectionError.render();
    }
  }
  $.ajax(movieQuery);
} // End of getMovie

// Movies parent class constructor
var Movies = function(movie) {
  this.title = movie.Title;
  this.posterURL = movie.Poster;
  this.img = document.createElement('img');
  this.movieID = movie.imdbID;
  if(this.posterURL != 'N/A') {
    this.img.src = 'http://img.omdbapi.com/?apikey=d31f1a94&i=' + this.movieID + '&h=1000';
  } else {
    this.img.src = '/images/no-poster-available.png'
  }
  this.heading = document.createElement('h1');
  this.heading.innerHTML = this.title;
}

var MovieListItem = function(movie , i) {
  Movies.call(this, movie); // inherit properties and methods of Movies
  this.searchID = movie.imdbID;
  this.year = movie.Year;
  this.initialize = function() {
    this.wrapper = document.createElement('div');
    this.wrapper.id = this.searchID;
    if(((i + 1 ) % 3) == 0 ) {
      this.wrapper.className = 'third-item';
    }
    if( i % 2 != 0 ) {
      if(((i + 1 ) % 3) == 0 ) {
        this.wrapper.className += ' even-item'
      }
      else {
        this.wrapper.className = 'even-item';
      }
    }
    this.date = document.createElement('p');
    this.date.innerHTML = this.year;
  }
  this.render = function() {
    if(this.hasOwnProperty('img')) {
      this.wrapper.appendChild(this.img);
    }
    this.wrapper.appendChild(this.heading);
    this.wrapper.appendChild(this.date);
    this.wrapper.addEventListener( 'click', Game.getMovie, false );
    Game.container.appendChild(this.wrapper);
  }
} // End of MovieListItem constructor
MovieListItem.prototype = Object.create(Movies.prototype); // MovieListItem extends Movies


// Display movies by creating a MovieListItem for each search result
MovieList = function(data) {
  if(data.hasOwnProperty('Search')) {
    var movies = data.Search;
    Game.container.innerHTML = '';
    var listHeading = document.createElement('h1');
    listHeading.id = 'movie-list-title';
    listHeading.innerHTML = 'Which movie did you have in mind?';
    Game.container.appendChild(listHeading);
    for( var i = 0; i < movies.length; i++ ) {
      var displayMovie = new MovieListItem( movies[i] , i );
      displayMovie.initialize();
      displayMovie.render();
    }
  }
} // End of MovieList

// Movie object constructor
function Movie( data , isCorrect ) {
  Movies.call(this, data);
  this.awards = data.Awards;
  this.display = null;
  this.rating = data.tomatoMeter;
  this.correct = isCorrect;
  this.cast = data.Actors.split( ', ');

  // Create text that tells how many Oscars the movie won
  this.createAwardsText = function() {
    var output = '';
    if( this.awards.search( /Oscar/ ) != -1 ) {
      output = this.awards.split('. ')[0].split(' '); // Get the first sentence and split the words
      output[0] = output[0].toLowerCase();
      output = output.join(' ');
      var was = '';
      if(output.search(/nominated/) != -1) { // Add "was" if movie was nominated
        was = 'was '
      }
      output = ' Did you know this movie ' + was + output + '?';
    }
    return output;
  }
  this.awardsText = this.createAwardsText();


  // Pick an actor from the cast of the given movie
  this.getRandomActor = function() {
    var newCast = this.cast;
    for( var i = 0; i < this.cast.length; i++ ) { // Remove current actor from array of new actors
      if( this.cast[i] == Game.currentActor ) {
        newCast.splice( i, 1 );
      }
    }
    if ( Game.difficulty == 'hard' ) { // Pick from full cast
      return newCast[Math.floor(Math.random()*(newCast.length))]; // Pick random actor
    }
    else { // Pick from first two actors
      return newCast[Math.floor(Math.random()*(2))];
    }
  } // End of getRandomActor

  if(this.correct) {
    this.randomActor = this.getRandomActor();
    Game.currentActor = this.randomActor;
  }

  // Comment on given movie based on Rotten Tomatoes rating
  this.getSnarky = function() {
    if(this.rating >= 93) {
      var comments = ['Classic!', 'Great film.', 'Excellent.'];
    }
    else if( this.rating < 93 && this.rating >= 75 ) {
      var comments = ['Nice pick.', 'Good flick.', 'That&rsquo;ll work.'];
    }
    else if( this.rating < 80 && this.rating >= 55 ) {
      var comments = ['Decent picture.', 'Not horrible.', 'Please don&rsquo;t Netflix and Chill with that movie.'];
    }
    else {
      var comments = ['Meh, that movie was ok.', 'So, did you like that movie?', 'That is, technically, a movie.'];
    }
    return comments[Math.floor(Math.random()*3)]
  } // End of getSnarky

  this.textContent = function() {
    var also = '';
    if( Game.score > 0 ) {
      also = ' also';
    }
    if(this.correct) {
      this.actor.innerHTML = this.randomActor + also + ' stars in this movie. Name another movie in which ' + this.randomActor + ' has a starring role.';
      if( Game.twoPlayer ) {
        if(Game.currentPlayer % 2 != 0 ) {
        var player = 'Player 1';
        }
        else if( Game.currentPlayer %2 == 0 ) {
          var player = 'Player 2';
        }
        this.actor.innerHTML = '<strong>' + player + ':</strong> ' + this.actor.innerHTML;
      }
    }
    else {
      this.actor.className += ' red-text';
      // Join cast array with 'and' added where appropriate
      if( this.cast.length == 1 ) {
        var fullCast = this.cast[0];
      }
      else if ( this.cast.length == 2 ) {
        var fullCast = this.cast.join( ' and ' );
      }
      else if ( this.cast.length > 2 ){
        var fullCast = this.cast.slice(0, -1).join(', ') + ', and ' + this.cast.slice(-1);
      }
      this.actor.innerHTML = 'Sorry, ' + Game.currentActor + ' does not have a leading role in that movie. The official cast is ' + fullCast + '.';
      this.newGamePrompt = document.createElement('p');
      this.newGamePrompt.className = 'lead';
      this.newGamePrompt.innerHTML = 'Want to try again? Enter a new movie and go for it!'
    }
  } // end of textContent

  this.scoresOutput = function() {
    if( !Game.twoPlayer ) {
      if(this.correct) {
        this.showScore.innerHTML = 'Current score: ' + Game.score;
      } else {
        this.showScore.innerHTML = 'Your final score was: ' + Game.score;
      }
    }
    else {
      this.showScore.innerHTML = '<span class="light-grey-text">Player 1:</span>&nbsp;' + Game.playerOneScore + '<br><span class="light-grey-text">Player 2:</span>&nbsp;' + Game.playerTwoScore;
      if( this.correct ) {
        var scoreState = 'Current Scores';
      } else {
        var scoreState = 'Final Scores';
      }
      this.showScore.innerHTML = '<strong>' + scoreState + '</strong><br>' + this.showScore.innerHTML;
    }
  } // End of scoresOutput

  this.encouragement = function() {
    var messages = ['You&rsquo;re doing an amazing job!', 'Wow, you&rsquo;re good at this!', 'You work in Hollywood, don&rsquo;t you.', 'You should be on Jeopardy!']
    if( Game.score != 0 && Game.score % 2 == 0 && this.correct ) { // Every two points
      var youRock = document.createElement('p');
      youRock.className = 'lead';
      youRock.id = 'encouragement';
      youRock.innerHTML = messages[Math.floor(Math.random() * messages.length)];
      this.container.appendChild(youRock);
    }
    else return false;
  }

  this.initialize = function() {
    this.container = document.createElement('section');
    this.container.className = 'movie-info';
    this.comment = document.createElement('p');
    this.comment.className = 'lead';
    this.comment.innerHTML = this.getSnarky();
    this.comment.innerHTML += this.createAwardsText();
    this.actor = document.createElement('p');
    this.actor.className = 'lead';
    this.textContent();
    this.movieInput = Game.makeSearchInput();
    this.showScore = document.createElement('p');
    this.showScore.className = 'lead';
    this.scoresOutput();
    this.img.className = 'single-movie';
  } // End of initliaze

  this.render = function() {
    Game.container.innerHTML = ''; // Empty container
    this.container.innerHTML = '';
    this.container.appendChild(this.heading);
    this.encouragement();
    this.container.appendChild(this.comment);
    this.container.appendChild(this.actor);
    if(!(this.correct)) {
      this.container.appendChild(this.newGamePrompt);
      Game.resetGame();
    }
    this.container.appendChild(this.movieInput);
    this.container.appendChild(this.showScore);
    Game.container.appendChild(this.container);
    Game.container.appendChild(this.img);
  } // End of render

} // End of Movie constructor
Movie.prototype = Object.create(Movies.prototype);

// Error messages
var Errors = {};
Errors.notFound = 'I didn&rsquo;t find any movies that match your search. Try a different spelling.';
Errors.sameMovie = 'Looks like that movie&rsquo;s already been used. Pick a different movie, or try searching again.';
Errors.noMovie = 'I wasn&rsquo;t able to find that movie. Try a different spelling.';
Errors.badConnection = 'There may be a problem with your connection. Please verify you&rsquo;re connected to the internet and try again.';

// Error message constructor
function Error( message ) {
  this.initialize = function() {
    this.message = message;
  }
  this.render = function() {
    var previousError = document.getElementById('error'); // Get current error message
    if( previousError == null ) { // Create an error p tag if it doesn't exist
      var errorMessage = document.createElement('p');
      errorMessage.className = 'lead';
      errorMessage.id = 'error';
    }
    else {
      var errorMessage = document.getElementById('error');
    }
    errorMessage.innerHTML = this.message;
    if( this.message == Errors.sameMovie ) {
      var element = Game.container.getElementsByTagName('div')[0];
      var movieInput = Game.makeSearchInput();
      movieInput.className = 'full-search';
    }
    else {
      var element = document.getElementById('movie-search');
    }
    var parent = element.parentNode;
    parent.insertBefore( errorMessage , element );
    var searchExists = document.getElementById('movie-search');
    if( !searchExists && movieInput ) {
      parent.insertBefore( movieInput, element );
    }
    Game.fadeInContainer();
    $('#movie-search').velocity("callout.shake", { delay: 200 });
  }
} // End of Error constructor

// Show and hide loading animation while waiting for AJAX response
$(document).ajaxStart( function() {
  $("#movie-container").hide();
  $("#loading").show();
})

$(document).ajaxStop( function() {
  $("#loading").hide();
  $("#movie-container").show();
});

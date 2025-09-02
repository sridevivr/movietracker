https://movie-tracker-sridevivr.replit.app/ 
Technical Implementation:
1.	What specific features did you build? (rating system, watchlists, search, etc.)
•	Search for movies and TV shows using the TMDB API.
•	Ability to select the content as: Watched, currently watching or want to watch
•	Ability to switch from Want to watch to currently watching and then to want to watch.
•	As soon as its marked as watched, the user has the ability to add “Date finished”, that way you know when you watched what. 
•	You can also add a rating to the show/movie.
•	You can also sort all the movies that you’ve watched based on Title, Date finished, Rating.
•	We all have fallen into the trap of rewatching the same shows – “Comfort shows”. I wanted to know how many shows I’ve rewatched and how many times, and how often. So tracking those things.
•	I wanted to track some viewing stats as well:
1.	How many hours of television have I watched
2.	How many hours of television am I spending on rewatching the same shows
3.	What’s the genre I enjoy the most?
4.	How do I rate what I watch?
•	I had some visual analytics onboard as well:
1.	What are my favourite genres ?
2.	What does my rating trend look like?
•	With respect to currently watching, I wanted to track the progress. For example, if it’s a tv show, I can enter the season and the episode that I’m currently stuck on.
•	I also wanted to be able to sign in using Google (SSO).
•	Used Firebase for backend
2.	Which Google Cloud APIs did you use? (recommendations engine, data analysis, etc.)
•	I added google authentication, so the user can easily sign in using google SSO. I didn’t want the user to have to create a new username and password, and have to remember that. 
3.	How did you structure the data? (movies, shows, user ratings, viewing history)
•	Currently watching
•	Movies
•	TV shows
•	Rewatches
•	Watchlist
•	Watched
•	Rating
•	Dates
4.	What AI-powered features specifically? (recommendation algorithm, genre analysis, etc.)
•	I initially added a gemini API so I could write down what I remembered about the movie and I could get suggestions based on that. But I removed the feature. 

Problem & User Experience:
1.	What was missing from existing solutions? (Goodreads for books vs. your needs for movies/TV)
•	I felt like there was no real solution. I set out to try and create an app that would automatically log what we watch through our streaming platforms, however I realized that the streaming platforms guard their APIs and data pretty heavily. I checked out letterboxd, but I felt like I couldn’t get the analytics that I wanted without paying.
•	Plus I didn’t see anywhere I could log TV shows, which is what I watch a lot of, so do many people I know. 
2.	Who was your target user? (just you, or did others test it?)
•	My target user was just me when I created it, because I wanted a personal app to try a few things. But I think this is for mostly millennials and GenZ users who watch a lot of esoteric movies or tv shows. 
3.	What specific pain points were you solving? (remembering what you watched, finding similar content, etc.)
•	I was worried that I was spending way too much time rewatching tv shows, but I wanted to also see how many hours, what do I watch, and figure out why I gravitate towards this sort of content. 
•	But also, many times when people ask me for recommendations, I have nothing to say or I say something generic – even when I’ve watched some pretty spectacular and weird tv shows and movies
Impact & Metrics:
1.	How many movies/shows have you logged?
•	Over 50
2.	What insights did the analytics reveal? 
3.	How much time did it save you? (vs. manual tracking)
4.	Any surprising discoveries from your data?
•	My rewatching hours, as I thought was quite high. I thought my most watched genre would be comedy given that sitcoms are my comfort genre, but it turns out its crime-comedy. 
Development Process:
1.	How long did it take to build? 
•	This took me two days to build.
2.	What challenges did you face? 
•	Figuring out what I needed to place first and where, what the first thing I want to see, what are the other things, and how to prioritize them.
•	Figuring out the google authentication took some time
3.	How did you iterate based on usage?
•	I haven’t iterated it yet



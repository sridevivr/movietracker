export interface TMDBSearchResult {
  tmdbId: string;
  title: string;
  overview: string;
  releaseDate: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  type: 'movie' | 'tv';
  genres: string[];
}

export const getImageUrl = (path: string | null, size: string = 'w500'): string => {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  // OMDB provides direct image URLs, so return them as-is
  return path;
};

export const formatReleaseDate = (date: string): string => {
  if (!date) return 'Unknown';
  // OMDB returns just the year, so return it directly
  return date;
};

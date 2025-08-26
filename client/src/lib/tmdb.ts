export interface TMDBSearchResult {
  tmdbId: number;
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
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const formatReleaseDate = (date: string): string => {
  if (!date) return 'Unknown';
  return new Date(date).getFullYear().toString();
};

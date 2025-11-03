export interface Game {
  id: number;
  title: string;
  description: string;
  category: 'action' | 'puzzle' | 'shooter' | 'platformer' | 'fighting';
  year: number;
  rating: number;
  icon: string;
}
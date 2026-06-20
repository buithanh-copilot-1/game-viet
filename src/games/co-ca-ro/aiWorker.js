import { getAIMove } from './aiEngine';

self.onmessage = (event) => {
  const { board, level, aiPlayer, humanPlayer, requestId } = event.data;
  const move = getAIMove(board, level, aiPlayer, humanPlayer);
  self.postMessage({ move, requestId });
};

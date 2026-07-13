import { getAIMove } from './chessEngine.js';

self.onmessage = ({ data }) => {
  const { state, level, requestId } = data;
  const move = getAIMove(state, level);
  self.postMessage({ move, requestId });
};

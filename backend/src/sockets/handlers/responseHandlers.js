const responseService = require('../../services/responseService');

const handleResponseSubmit = async (io, socket, payload) => {
  try {
    const { roundId, answer } = payload;
    const username = socket.user.username;
    
    // Using service to ensure exactly same logic as REST API
    const result = await responseService.submitResponse(roundId, username, answer);
    
    // Send feedback only to the submitting user
    socket.emit('response:result', result);
  } catch (err) {
    socket.emit('error', { message: err.message, code: 'RESPONSE_ERROR' });
  }
};

module.exports = { handleResponseSubmit };

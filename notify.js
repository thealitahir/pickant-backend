const { messaging } = require('./firebaseInit');

const sendNotificationToClient = async (tokens, data, cb) => {
  // Send a message to the device corresponding to the provided
  // registration token.
//   var newTokensArray = [];
//  await tokens.map((token) => {
//     if (token !== null || token !==" ") {
//       newTokensArray.push(token);
//     }
//   })
//   console.log(newTokensArray)
  messaging
    .sendMulticast({ tokens, data })
    .then(response => {
      // Response is an object of the form { responses: [] }
      const successes = response.responses.filter(r => r.success === true)
        .length;
      const failures = response.responses.filter(r => r.success === false)
        .length;
      console.log(
        'Notifications sent:',
        `${successes} successful, ${failures} failed`
      );
      cb(data);
    })
    .catch(error => {
      console.log('Error sending message:', error);
    });
};

module.exports = {
  sendNotificationToClient
}
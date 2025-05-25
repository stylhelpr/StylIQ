exports.handlePost = (req, res) => {
  const {message} = req.body;
  console.log('Received:', message);
  res.json({reply: `Server received: ${message}`});
};

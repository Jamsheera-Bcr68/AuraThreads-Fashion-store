



const statusMessages = {
  CREATED: (item) => `${item} created successfully.`,
  UPDATED: (item) => `${item} updated successfully.`,
  DELETED: (item) => `${item} deleted successfully.`,
  EXISTS: (item) => `${item} already exists.`,
  NOT_FOUND: (item) => `${item} not found.`,
  REQUIRED: (item) => `${item} is required.`,
  INVALID: (item) => `${item} is invalid.`,
  OUT_OF_STOCK: (item) => `${item} is currently out of stock.`,
   SERVER_ERROR: 'Internal server error. Please try again later.'
};



module.exports = statusMessages;

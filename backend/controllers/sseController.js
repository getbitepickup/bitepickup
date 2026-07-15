const logger = require("../utils/logger");

/**
 * Store active SSE connections by restaurantId
 */
const clients = new Map();

/**
 * Get all clients for a specific restaurant
 */
const getClientsForRestaurant = (restaurantId) => {
  return clients.get(restaurantId) || [];
};

/**
 * Add a client to the restaurant's client list
 */
const addClient = (restaurantId, res) => {
  if (!clients.has(restaurantId)) {
    clients.set(restaurantId, []);
  }
  clients.get(restaurantId).push(res);

  const count = clients.get(restaurantId).length;
  logger.info(
    `📡 SSE: Client connected for restaurant ${restaurantId}. Total: ${count}`,
  );

  return () => {
    const restaurantClients = clients.get(restaurantId);
    if (restaurantClients) {
      const index = restaurantClients.indexOf(res);
      if (index !== -1) {
        restaurantClients.splice(index, 1);
        logger.info(
          `📡 SSE: Client disconnected for restaurant ${restaurantId}. Remaining: ${restaurantClients.length}`,
        );
      }
      if (restaurantClients.length === 0) {
        clients.delete(restaurantId);
      }
    }
  };
};

/**
 * Broadcast a new order event to all clients of a restaurant
 */
const broadcastNewOrder = (restaurantId, orderData) => {
  const restaurantIdStr = restaurantId.toString();
  const restaurantClients = getClientsForRestaurant(restaurantIdStr);

  if (restaurantClients.length === 0) {
    logger.info(
      `📡 SSE: No clients connected for restaurant ${restaurantIdStr}`,
    );
    return;
  }

  const eventData = `data: ${JSON.stringify({
    type: "NEW_ORDER",
    data: orderData,
    timestamp: new Date().toISOString(),
  })}\n\n`;

  let sentCount = 0;
  restaurantClients.forEach((client) => {
    try {
      client.write(eventData);
      sentCount++;
    } catch (error) {
      logger.error(`❌ SSE: Failed to send to client: ${error.message}`);
    }
  });

  logger.info(
    `📡 SSE: Broadcasted new order to ${sentCount} clients for restaurant ${restaurantIdStr}`,
  );
};

/**
 * Broadcast an order status update to all clients of a restaurant
 */
const broadcastOrderStatusUpdate = (restaurantId, orderId, status) => {
  const restaurantIdStr = restaurantId.toString();
  const restaurantClients = getClientsForRestaurant(restaurantIdStr);

  if (restaurantClients.length === 0) {
    return;
  }

  const eventData = `data: ${JSON.stringify({
    type: "ORDER_STATUS_UPDATE",
    data: { orderId, status },
    timestamp: new Date().toISOString(),
  })}\n\n`;

  let sentCount = 0;
  restaurantClients.forEach((client) => {
    try {
      client.write(eventData);
      sentCount++;
    } catch (error) {
      logger.error(`❌ SSE: Failed to send status update: ${error.message}`);
    }
  });

  logger.info(
    `📡 SSE: Broadcasted status update to ${sentCount} clients for restaurant ${restaurantIdStr}`,
  );
};

/**
 * Handle SSE connection
 * Endpoint: GET /api/orders/stream/:restaurantId
 */
const handleSSEConnection = (req, res) => {
  const { restaurantId } = req.params;

  if (!restaurantId) {
    return res.status(400).json({
      success: false,
      message: "Restaurant ID is required",
    });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  res.write(
    `data: ${JSON.stringify({
      type: "CONNECTED",
      message: "SSE connection established",
      restaurantId,
      timestamp: new Date().toISOString(),
    })}\n\n`,
  );

  const removeClient = addClient(restaurantId, res);

  req.on("close", () => {
    removeClient();
  });

  const pingInterval = setInterval(() => {
    try {
      res.write(`: ping ${Date.now()}\n\n`);
    } catch (error) {
      clearInterval(pingInterval);
      removeClient();
    }
  }, 30000);

  req.on("close", () => {
    clearInterval(pingInterval);
  });

  logger.info(`📡 SSE: Connection established for restaurant ${restaurantId}`);
};

module.exports = {
  handleSSEConnection,
  broadcastNewOrder,
  broadcastOrderStatusUpdate,
  getClientsForRestaurant,
};

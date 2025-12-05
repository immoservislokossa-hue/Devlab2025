// Custom functions for handling bulk quotes and transfers

module.exports = {
  bulkQuotes: {
    buildIndividualQuoteResults: (context) => {
      const request = context.request;
      if (!request.body || !request.body.individualQuotes) {
        return [];
      }
      
      return request.body.individualQuotes.map((quote) => {
        // Generate ILP packet and condition
        const ilpPacket = generateRandomHex(256);
        const condition = generateRandomHex(64);
        
        return {
          quoteId: quote.quoteId,
          transferAmount: quote.amount ? {
            amount: quote.amount,
            currency: quote.currency || 'XOF'
          } : undefined,
          payeeReceiveAmount: quote.amount ? {
            amount: quote.amount,
            currency: quote.currency || 'XOF'
          } : undefined,
          ilpPacket: ilpPacket,
          condition: condition,
          expiration: "2040-01-01T01:01:01.001Z",
          extensionList: null
        };
      });
    }
  },
  
  bulkTransfers: {
    buildIndividualTransferResults: (context) => {
      const request = context.request;
      if (!request.body || !request.body.individualTransfers) {
        return [];
      }
      
      return request.body.individualTransfers.map((transfer) => {
        // Generate fulfilment
        const fulfilment = generateRandomHex(64);
        
        return {
          transferId: transfer.transferId,
          fulfilment: fulfilment,
          extensionList: null
        };
      });
    }
  }
};

// Helper function to generate random hex strings
function generateRandomHex(length) {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

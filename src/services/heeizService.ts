
/**
 * Heeiz API Service
 * This service handles integration with the Heeiz platform in Iraq.
 * Note: You must replace the placeholders with your actual API credentials.
 */

export interface HeeizProductData {
  name: string;
  image: string;
  sku: string;
  price: number;
}

export interface HeeizStockResponse {
  sku: string;
  stock: number;
  status: string;
}

class HeeizService {
  private baseUrl = 'https://api.heeiz.com/v1'; // Placeholder URL
  private apiKey = ''; // Should be loaded from environment or settings
  private partnerId = '';

  setCredentials(apiKey: string, partnerId: string) {
    this.apiKey = apiKey;
    this.partnerId = partnerId;
  }

  /**
   * Sends product data to Heeiz to list or update it on their platform.
   */
  async sendProduct(product: HeeizProductData) {
    if (!this.apiKey) throw new Error('Heeiz API Key is missing');

    try {
      const response = await fetch(`${this.baseUrl}/products/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Partner-ID': this.partnerId
        },
        body: JSON.stringify({
          product_name: product.name,
          product_image: product.image,
          product_sku: product.sku,
          product_price: product.price
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send product to Heeiz');
      }

      return await response.json();
    } catch (error) {
      console.error('Heeiz sendProduct error:', error);
      throw error;
    }
  }

  /**
   * Fetches current stock levels from Heeiz for a specific SKU.
   */
  async getStock(sku: string): Promise<HeeizStockResponse> {
    if (!this.apiKey) throw new Error('Heeiz API Key is missing');

    try {
      const response = await fetch(`${this.baseUrl}/inventory/${sku}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Partner-ID': this.partnerId
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch stock from Heeiz');
      }

      return await response.json();
    } catch (error) {
      console.error('Heeiz getStock error:', error);
      throw error;
    }
  }

  /**
   * Decreases stock on Heeiz platform (e.g., after a sale).
   */
  async decreaseStock(sku: string, quantity: number) {
    if (!this.apiKey) throw new Error('Heeiz API Key is missing');

    try {
      const response = await fetch(`${this.baseUrl}/inventory/decrease`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Partner-ID': this.partnerId
        },
        body: JSON.stringify({
          sku: sku,
          quantity: quantity
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decrease stock on Heeiz');
      }

      return await response.json();
    } catch (error) {
      console.error('Heeiz decreaseStock error:', error);
      throw error;
    }
  }
}

export const heeizService = new HeeizService();

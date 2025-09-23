import { Controller, Get, Query } from '@nestjs/common';
import axios from 'axios';

@Controller('shopping')
export class ShoppingController {
  @Get('search')
  async search(@Query('q') q: string) {
    try {
      const options = {
        method: 'GET',
        url: 'https://amazon-product-search-api.p.rapidapi.com/products',
        params: { query: q, page: '1', country: 'US' },
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY!, // store in .env
          'x-rapidapi-host': 'amazon-product-search-api.p.rapidapi.com',
        },
      };

      const response = await axios.request(options);

      // Normalize data into your frontend-friendly format
      const products = (response.data?.results || []).map((item: any) => ({
        title: item.title,
        price: item.price?.current_price || 'N/A',
        image: item.image,
        link: item.url,
      }));

      return { products: products.slice(0, 3) }; // return only top 3
    } catch (err: any) {
      console.error('RapidAPI error', err?.response?.data || err.message);
      return { products: [] };
    }
  }
}

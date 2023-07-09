import axios from 'axios';

export const extraerDataFactura = async (filename, id) => {
    try {
      const url = 'http://localhost:5000';
      const data = {
        filename,
        id,
      };
      const headers = {
        'Content-Type': 'application/json',
      };
      const response = await axios.post(url, data, { headers });
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to post factura');
    }
  };

export default extraerDataFactura;


const errorDictionary = {
  'missingFields': 'Campos obligatorios faltantes al crear un producto',
  'invalidPrice': 'Precio inválido al agregar un producto al carrito',

};

const customizeError = (errorCode) => {
  return {
    code: errorCode,
    message: errorDictionary[errorCode] || 'Error desconocido',
  };
};

module.exports = customizeError;

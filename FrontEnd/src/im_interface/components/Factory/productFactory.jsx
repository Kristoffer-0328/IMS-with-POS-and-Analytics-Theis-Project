export const ProductFactory = {
    /**
     * Creates a standardized product object
     * @param {Object} data - Raw product data from any source
     * @returns {Object} - Standardized product object
     */
    createProduct(data) {
      // Extract custom fields (fields not in our standard schema)
      const { 
        ProductName, Category, Quantity, UnitPrice, Unit, 
        LengthPerUnit, RestockLevel, Location, Date, image,
        ...customFields 
      } = data;
  
      return {
        ProductName: ProductName || data.name || "",
        Category: Category || data.category || "",
        Quantity: Number(Quantity || data.quantity || 0),
        UnitPrice: Number(UnitPrice || data.unitPrice || 0),
        Unit: Unit || data.unit || "pcs",
        Location: Location || data.location || null,
        RestockLevel: Number(RestockLevel || data.restockLevel || 0),
        Date: Date || data.date || null,
        image: image || null,
        variants: [], // Initialize empty variants array
        // Include any additional fields as custom fields
        ...customFields
      };
    },
  
    /**
     * Creates a standardized variant object
     * @param {Object} data - Raw variant data from any source
     * @returns {Object} - Standardized variant object
     */
    createVariant(data) {
      // Extract custom fields (fields not in our standard schema)
      const {
        Size, value, Quantity, quantity, UnitPrice, unitPrice,
        Unit, unit, RestockLevel, restockLevel, Location, location,
        Date, date, LengthPerUnit, length, image,
        ...customFields
      } = data;
  
      return {
        value: value || Size || "", // Standardize on 'value' field name
        quantity: Number(quantity || Quantity || 0),
        unitPrice: Number(unitPrice || UnitPrice || 0),
        unit: unit || Unit || "pcs",
        restockLevel: Number(restockLevel || RestockLevel || 0),
        location: location || Location || null,
        date: date || Date || null,
        length: length || LengthPerUnit || null, // Keep length field from CSV
        image: image || null,
        // Include any additional custom fields
        ...customFields
      };
    }
  };
  
  export default ProductFactory;
import { describe, expect, it, beforeEach } from "vitest";

// Mock contract's state and interactions
let contractState = {
  owner: "SP1OWNER000000000000000000000000000000000",
  entities: {},
  products: {},
  transferHistory: {},
  transferIdCounter: 0
};

// Test accounts
const owner = "SP1OWNER000000000000000000000000000000000";
const manufacturer = "SP2MANUFACTURER0000000000000000000000000";
const distributor = "SP3DISTRIBUTOR00000000000000000000000000";
const retailer = "SP4RETAILER0000000000000000000000000000000";

// Mock contract functions
const contractFunctions = {
  registerEntity: (sender, name, role) => {
    if (contractState.entities[sender]) {
      return { type: "err", value: 102 }; // err-already-exists
    }
    
    contractState.entities[sender] = {
      name,
      role,
      isVerified: false
    };
    
    return { type: "ok", value: true };
  },
  
  verifyEntity: (sender, entityId) => {
    if (sender !== contractState.owner) {
      return { type: "err", value: 100 }; // err-owner-only
    }
    
    if (!contractState.entities[entityId]) {
      return { type: "err", value: 101 }; // err-not-found
    }
    
    contractState.entities[entityId].isVerified = true;
    return { type: "ok", value: true };
  },
  
  isEntityVerified: (entityId) => {
    return contractState.entities[entityId]?.isVerified || false;
  },
  
  registerProduct: (sender, productId, name, description, origin) => {
    if (!contractFunctions.isEntityVerified(sender)) {
      return { type: "err", value: 103 }; // err-unauthorized
    }
    
    if (contractState.products[productId]) {
      return { type: "err", value: 102 }; // err-already-exists
    }
    
    contractState.products[productId] = {
      name,
      description,
      origin,
      creationTime: Date.now(),
      currentOwner: sender,
      isActive: true
    };
    
    // Record initial transfer
    contractFunctions.recordTransfer(productId, contractState.owner, sender, origin, "Product created");
    
    return { type: "ok", value: true };
  },
  
  transferProduct: (sender, productId, newOwner, location, notes) => {
    const product = contractState.products[productId];
    
    if (!product) {
      return { type: "err", value: 101 }; // err-not-found
    }
    
    if (product.currentOwner !== sender || 
        !product.isActive || 
        !contractFunctions.isEntityVerified(sender) || 
        !contractFunctions.isEntityVerified(newOwner)) {
      return { type: "err", value: 103 }; // err-unauthorized
    }
    
    product.currentOwner = newOwner;
    
    // Record the transfer
    return contractFunctions.recordTransfer(productId, sender, newOwner, location, notes);
  },
  
  recordTransfer: (productId, from, to, location, notes) => {
    const transferId = contractState.transferIdCounter++;
    
    if (!contractState.transferHistory[productId]) {
      contractState.transferHistory[productId] = {};
    }
    
    contractState.transferHistory[productId][transferId] = {
      from,
      to,
      timestamp: Date.now(),
      location,
      notes
    };
    
    return { type: "ok", value: transferId };
  },
  
  deactivateProduct: (sender, productId) => {
    const product = contractState.products[productId];
    
    if (!product) {
      return { type: "err", value: 101 }; // err-not-found
    }
    
    if (product.currentOwner !== sender) {
      return { type: "err", value: 103 }; // err-unauthorized
    }
    
    product.isActive = false;
    return { type: "ok", value: true };
  },
  
  addCertification: (sender, productId, certificationDetails, location) => {
    if (!contractFunctions.isEntityVerified(sender)) {
      return { type: "err", value: 103 }; // err-unauthorized
    }
    
    const product = contractState.products[productId];
    
    if (!product) {
      return { type: "err", value: 101 }; // err-not-found
    }
    
    return contractFunctions.recordTransfer(
      productId, 
      sender, 
      product.currentOwner, 
      location, 
      certificationDetails
    );
  },
  
  getProduct: (productId) => {
    return contractState.products[productId] || null;
  },
  
  getEntity: (entityId) => {
    return contractState.entities[entityId] || null;
  },
  
  getTransferRecord: (productId, transferId) => {
    return contractState.transferHistory[productId]?.[transferId] || null;
  }
};

describe("Supply Chain Tracking Contract Tests", () => {
  // Reset state before each test
  beforeEach(() => {
    contractState = {
      owner: "SP1OWNER000000000000000000000000000000000",
      entities: {},
      products: {},
      transferHistory: {},
      transferIdCounter: 0
    };
  });

  describe("Entity Registration and Verification", () => {
    it("should allow an entity to register", () => {
      const result = contractFunctions.registerEntity(
        manufacturer, 
        "Acme Manufacturing", 
        "manufacturer"
      );
      
      expect(result).toEqual({ type: "ok", value: true });
      expect(contractState.entities[manufacturer]).toEqual({
        name: "Acme Manufacturing",
        role: "manufacturer",
        isVerified: false
      });
    });

    it("should not allow an entity to register twice", () => {
      // First registration
      contractFunctions.registerEntity(manufacturer, "Acme Manufacturing", "manufacturer");
      
      // Second attempt
      const result = contractFunctions.registerEntity(
        manufacturer, 
        "Acme Manufacturing 2", 
        "manufacturer"
      );
      
      expect(result).toEqual({ type: "err", value: 102 }); // err-already-exists
    });

    it("should allow owner to verify an entity", () => {
      // Register first
      contractFunctions.registerEntity(manufacturer, "Acme Manufacturing", "manufacturer");
      
      // Verify
      const result = contractFunctions.verifyEntity(owner, manufacturer);
      
      expect(result).toEqual({ type: "ok", value: true });
      expect(contractState.entities[manufacturer].isVerified).toBe(true);
    });

    it("should not allow non-owner to verify an entity", () => {
      // Register first
      contractFunctions.registerEntity(manufacturer, "Acme Manufacturing", "manufacturer");
      contractFunctions.registerEntity(distributor, "Global Distributors", "distributor");
      
      // Attempt to verify as non-owner
      const result = contractFunctions.verifyEntity(manufacturer, distributor);
      
      expect(result).toEqual({ type: "err", value: 100 }); // err-owner-only
      expect(contractState.entities[distributor].isVerified).toBe(false);
    });
  });

  describe("Product Registration and Tracking", () => {
    beforeEach(() => {
      // Register and verify entities
      contractFunctions.registerEntity(manufacturer, "Acme Manufacturing", "manufacturer");
      contractFunctions.verifyEntity(owner, manufacturer);
      
      contractFunctions.registerEntity(distributor, "Global Distributors", "distributor");
      contractFunctions.verifyEntity(owner, distributor);
      
      contractFunctions.registerEntity(retailer, "Main Street Shop", "retailer");
      contractFunctions.verifyEntity(owner, retailer);
    });

    it("should allow a verified manufacturer to register a product", () => {
      const result = contractFunctions.registerProduct(
        manufacturer,
        "PROD-001",
        "Smartphone XYZ",
        "Latest smartphone model with advanced features",
        "Factory A"
      );
      
      expect(result).toEqual({ type: "ok", value: true });
      
      const product = contractFunctions.getProduct("PROD-001");
      expect(product).not.toBeNull();
      expect(product.name).toBe("Smartphone XYZ");
      expect(product.currentOwner).toBe(manufacturer);
      expect(product.isActive).toBe(true);
      
      // Check that initial transfer was recorded
      expect(contractState.transferHistory["PROD-001"]).toBeDefined();
      expect(Object.keys(contractState.transferHistory["PROD-001"]).length).toBe(1);
    });

    it("should not allow unverified entities to register products", () => {
      // Create unverified entity
      contractFunctions.registerEntity("SP5UNVERIFIED00000000000000000000000000", "Fake Company", "manufacturer");
      
      const result = contractFunctions.registerProduct(
        "SP5UNVERIFIED00000000000000000000000000",
        "FAKE-001",
        "Counterfeit Product",
        "Fake description",
        "Unknown"
      );
      
      expect(result).toEqual({ type: "err", value: 103 }); // err-unauthorized
      expect(contractFunctions.getProduct("FAKE-001")).toBeNull();
    });

    it("should allow product transfer between verified entities", () => {
      // Register product
      contractFunctions.registerProduct(
        manufacturer,
        "PROD-001",
        "Smartphone XYZ",
        "Latest smartphone model with advanced features",
        "Factory A"
      );
      
      // Transfer from manufacturer to distributor
      const transferResult = contractFunctions.transferProduct(
        manufacturer,
        "PROD-001",
        distributor,
        "Distribution Center B",
        "Bulk shipment of 1000 units"
      );
      
      expect(transferResult.type).toBe("ok");
      
      // Check product owner was updated
      const product = contractFunctions.getProduct("PROD-001");
      expect(product.currentOwner).toBe(distributor);
      
      // Check transfer history was recorded
      expect(Object.keys(contractState.transferHistory["PROD-001"]).length).toBe(2);
    });

    it("should not allow unauthorized transfers", () => {
      // Register product
      contractFunctions.registerProduct(
        manufacturer,
        "PROD-001",
        "Smartphone XYZ",
        "Latest smartphone model with advanced features",
        "Factory A"
      );
      
      // Attempt unauthorized transfer
      const result = contractFunctions.transferProduct(
        distributor, // Not the current owner
        "PROD-001",
        retailer,
        "Retail Store C",
        "Unauthorized transfer"
      );
      
      expect(result).toEqual({ type: "err", value: 103 }); // err-unauthorized
      
      // Check product owner remains unchanged
      const product = contractFunctions.getProduct("PROD-001");
      expect(product.currentOwner).toBe(manufacturer);
    });

    it("should allow product deactivation by owner", () => {
      // Register product
      contractFunctions.registerProduct(
        manufacturer,
        "PROD-001",
        "Smartphone XYZ",
        "Latest smartphone model with advanced features",
        "Factory A"
      );
      
      // Deactivate product
      const result = contractFunctions.deactivateProduct(manufacturer, "PROD-001");
      
      expect(result).toEqual({ type: "ok", value: true });
      
      // Check product is inactive
      const product = contractFunctions.getProduct("PROD-001");
      expect(product.isActive).toBe(false);
    });

    it("should allow adding certifications by verified entities", () => {
      // Register product
      contractFunctions.registerProduct(
        manufacturer,
        "PROD-001",
        "Smartphone XYZ",
        "Latest smartphone model with advanced features",
        "Factory A"
      );
      
      // Add certification
      const result = contractFunctions.addCertification(
        distributor, // A different verified entity
        "PROD-001",
        "Quality check passed: All features working as expected",
        "Testing Facility D"
      );
      
      expect(result.type).toBe("ok");
      
      // Check certification was recorded in transfer history
      const transferCount = Object.keys(contractState.transferHistory["PROD-001"]).length;
      expect(transferCount).toBe(2);
      
      // Product ownership shouldn't change from certification
      const product = contractFunctions.getProduct("PROD-001");
      expect(product.currentOwner).toBe(manufacturer);
    });
  });

  describe("Supply Chain End-to-End", () => {
    it("should track a product throughout its lifecycle", () => {
      // 1. Register and verify entities
      contractFunctions.registerEntity(manufacturer, "Acme Manufacturing", "manufacturer");
      contractFunctions.verifyEntity(owner, manufacturer);
      
      contractFunctions.registerEntity(distributor, "Global Distributors", "distributor");
      contractFunctions.verifyEntity(owner, distributor);
      
      contractFunctions.registerEntity(retailer, "Main Street Shop", "retailer");
      contractFunctions.verifyEntity(owner, retailer);
      
      // 2. Manufacturer registers product
      contractFunctions.registerProduct(
        manufacturer,
        "PROD-001",
        "Smartphone XYZ",
        "Latest smartphone model with advanced features",
        "Factory A"
      );
      
      // 3. Quality certification
      contractFunctions.addCertification(
        manufacturer,
        "PROD-001",
        "Quality assurance passed",
        "QA Lab"
      );
      
      // 4. Transfer to distributor
      contractFunctions.transferProduct(
        manufacturer,
        "PROD-001",
        distributor,
        "Distribution Center",
        "Bulk shipment"
      );
      
      // 5. Distributor adds certification
      contractFunctions.addCertification(
        distributor,
        "PROD-001",
        "Packaging verification completed",
        "Distribution Center"
      );
      
      // 6. Transfer to retailer
      contractFunctions.transferProduct(
        distributor,
        "PROD-001",
        retailer,
        "Retail Store",
        "Store inventory"
      );
      
      // 7. Retailer deactivates product (sold to customer)
      contractFunctions.deactivateProduct(retailer, "PROD-001");
      
      // Verify final state
      const product = contractFunctions.getProduct("PROD-001");
      expect(product.currentOwner).toBe(retailer);
      expect(product.isActive).toBe(false);
      
      // Verify transfer history
      const transferCount = Object.keys(contractState.transferHistory["PROD-001"]).length;
      expect(transferCount).toBe(5); // Initial + QA + Transfer + Certification + Transfer
      
      // Verify product can't be transferred after deactivation
      const finalTransfer = contractFunctions.transferProduct(
        retailer,
        "PROD-001",
        manufacturer, // Try to send back to manufacturer
        "Return Department",
        "Product return"
      );
      
      expect(finalTransfer).toEqual({ type: "err", value: 103 }); // err-unauthorized due to !isActive
    });
  });
});
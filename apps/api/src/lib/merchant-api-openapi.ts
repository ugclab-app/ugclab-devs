/** OpenAPI 3.0 document for the public Merchant Admin API (`/api/v1`). */
export function merchantApiOpenApiSpec(apiBaseUrl: string) {
  const base = apiBaseUrl.replace(/\/$/, "");
  return {
    openapi: "3.0.3",
    info: {
      title: "Tescommerce Merchant API",
      version: "1.0.0",
      description:
        "Public Admin API authenticated with a store API key (`Authorization: Bearer ugc_…`). Create keys in Growth → Webhooks.",
    },
    servers: [{ url: `${base}/api/v1` }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "ugc_",
          description: "Merchant API key starting with ugc_",
        },
        ApiKeyHeader: {
          type: "apiKey",
          in: "header",
          name: "X-Api-Key",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            retryAfterSec: { type: "integer" },
          },
        },
        ProductSummary: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            slug: { type: "string" },
            status: { type: "string" },
            type: { type: "string" },
            priceAmount: { type: "integer", description: "Minor units (cents)" },
            compareAt: { type: "integer", nullable: true },
            inventory: { type: "integer", nullable: true },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        OrderSummary: {
          type: "object",
          properties: {
            id: { type: "string" },
            orderNumber: { type: "string" },
            invoiceNumber: { type: "string", nullable: true },
            status: { type: "string" },
            totalAmount: { type: "integer" },
            tipAmount: { type: "integer", description: "Tip in minor units" },
            storeCreditAmount: { type: "integer", description: "Store credit applied, minor units" },
            loyaltyDiscountAmount: { type: "integer" },
            customFields: {
              type: "object",
              nullable: true,
              additionalProperties: { type: "string" },
              description: "Answers to merchant-defined checkout fields",
            },
            currency: { type: "string" },
            guestEmail: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            customer: {
              type: "object",
              nullable: true,
              properties: {
                email: { type: "string" },
                name: { type: "string", nullable: true },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }, { ApiKeyHeader: [] }],
    paths: {
      "/": {
        get: {
          summary: "API info",
          security: [],
          responses: {
            "200": {
              description: "Service metadata",
            },
          },
        },
      },
      "/openapi.json": {
        get: {
          summary: "This OpenAPI document",
          security: [],
          responses: { "200": { description: "OpenAPI 3 JSON" } },
        },
      },
      "/products": {
        get: {
          summary: "List products",
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
            },
          ],
          responses: {
            "200": {
              description: "Product list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      products: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ProductSummary" },
                      },
                      currency: { type: "string" },
                    },
                  },
                },
              },
            },
            "401": { description: "Invalid API key" },
            "429": { description: "Rate limited" },
          },
        },
      },
      "/products/{id}": {
        get: {
          summary: "Get product",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Product with images and variants" },
            "404": { description: "Not found" },
          },
        },
      },
      "/orders": {
        get: {
          summary: "List orders",
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["DRAFT", "PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"],
              },
            },
          ],
          responses: {
            "200": {
              description: "Order list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      orders: {
                        type: "array",
                        items: { $ref: "#/components/schemas/OrderSummary" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/orders/{id}": {
        get: {
          summary: "Get order",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Order with line items" },
            "404": { description: "Not found" },
          },
        },
      },
    },
  };
}

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        vendorId: string;
        role: "owner" | "staff";
      };
    }
  }
}

export {};
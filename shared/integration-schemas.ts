// This file contains schemas and types for integration with credit decision systems
// like Dealertrack Unify, RouteOne, and ODE

import { z } from 'zod';

// Common credit application structure accepted by all systems
export const creditApplicationDataSchema = z.object({
  applicant: z.object({
    firstName: z.string(),
    middleName: z.string().optional(),
    lastName: z.string(),
    ssn: z.string().optional(),
    dateOfBirth: z.string().optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
    }),
    housingStatus: z.enum(['own', 'rent', 'live_with_parents', 'other']).optional(),
    monthlyHousingPayment: z.number().optional(),
    employmentStatus: z.enum(['employed', 'self_employed', 'retired', 'unemployed']).optional(),
    employer: z.string().optional(),
    jobTitle: z.string().optional(),
    yearsEmployed: z.number().optional(),
    monthlyIncome: z.number().optional(),
    otherIncome: z.number().optional(),
  }),
  coApplicant: z.object({
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    ssn: z.string().optional(),
    dateOfBirth: z.string().optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
    }).optional(),
    relationshipToApplicant: z.string().optional(),
    employmentStatus: z.enum(['employed', 'self_employed', 'retired', 'unemployed']).optional(),
    employer: z.string().optional(),
    jobTitle: z.string().optional(),
    yearsEmployed: z.number().optional(),
    monthlyIncome: z.number().optional(),
  }).optional(),
  vehicle: z.object({
    year: z.number(),
    make: z.string(),
    model: z.string(),
    trim: z.string().optional(),
    vin: z.string(),
    msrp: z.number(),
    sellingPrice: z.number(),
    mileage: z.number().optional(),
    newOrUsed: z.enum(['new', 'used']),
  }),
  deal: z.object({
    requestedAmount: z.number(),
    downPayment: z.number().optional(),
    term: z.number().optional(),
    tradeInValue: z.number().optional(),
    tradeInPayoff: z.number().optional(),
  }),
  dealership: z.object({
    name: z.string(),
    dealerId: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
    }),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
  }),
  bankPreferences: z
    .array(
      z.object({
        bankId: z.string(),
        programId: z.string().optional(),
      })
    )
    .optional(),
});

export type CreditApplicationData = z.infer<typeof creditApplicationDataSchema>;

export const dealertrackUnifyMapperSchema = z.object({
  dealertrackDealerId: z.string(),
  dealertrackUserId: z.string(),
  routingPreferences: z.array(z.string()).optional(),
  dealertrackSpecificFields: z.record(z.any()).optional(),
});

export type DealertrackUnifyMapper = z.infer<typeof dealertrackUnifyMapperSchema>;

export const routeOneMapperSchema = z.object({
  routeOneDealerId: z.string(),
  routeOneUserId: z.string(),
  routeOnePassword: z.string().optional(),
  desiredPrograms: z.array(z.string()).optional(),
  routeOneSpecificFields: z.record(z.any()).optional(),
});

export type RouteOneMapper = z.infer<typeof routeOneMapperSchema>;

export const odeMapperSchema = z.object({
  odeDealerId: z.string(),
  odeApiKey: z.string(),
  lenderPriorities: z.array(z.string()).optional(),
  odeSpecificFields: z.record(z.any()).optional(),
});

export type OdeMapper = z.infer<typeof odeMapperSchema>;

export const creditResponseSchema = z.object({
  providerId: z.string(),
  providerName: z.string(),
  providerReferenceId: z.string(),
  status: z.enum(['approved', 'conditionally_approved', 'rejected', 'pending', 'error']),
  statusMessage: z.string().optional(),
  timestamp: z.string(),
  lenderResponses: z.array(
    z.object({
      lenderId: z.string(),
      lenderName: z.string(),
      status: z.enum(['approved', 'conditionally_approved', 'rejected', 'pending', 'error']),
      approvalAmount: z.number().optional(),
      maxApprovalAmount: z.number().optional(),
      apr: z.number().optional(),
      term: z.number().optional(),
      monthlyPayment: z.number().optional(),
      stipulations: z.array(
        z.object({
          type: z.string(),
          description: z.string(),
          required: z.boolean().optional(),
        })
      ).optional(),
      comments: z.string().optional(),
      expirationDate: z.string().optional(),
    })
  ),
  rawResponse: z.record(z.any()).optional(),
});

export type CreditResponse = z.infer<typeof creditResponseSchema>;

export const creditProviderConfigSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  type: z.enum(['dealertrack', 'routeone', 'ode']),
  credentials: z.union([
    dealertrackUnifyMapperSchema,
    routeOneMapperSchema,
    odeMapperSchema
  ]),
  apiEndpoint: z.string().url(),
  apiKey: z.string().optional(),
  active: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type CreditProviderConfig = z.infer<typeof creditProviderConfigSchema> & {
  type: 'dealertrack' | 'routeone' | 'ode';
  credentials: DealertrackUnifyMapper | RouteOneMapper | OdeMapper;
};

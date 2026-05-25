import { z } from "zod";
import {
  emptyToUndefined,
  optionalText,
  optionalNumeric,
  checkboxBool,
  optionalDate,
  parseForm,
} from "./shared";

export const dealFormSchema = z.object({
  // Identity
  name: optionalText,

  // Property
  parkAddress: optionalText,
  parkCity: optionalText,
  parkState: optionalText,
  parkType: optionalText,
  padsCount: optionalNumeric,
  cabinsCount: optionalText,
  tentSitesCount: optionalText,
  hotelMotelCount: optionalText,
  totalUnits: optionalNumeric,
  acresCount: optionalText,
  fullHookupPads: optionalText,
  waterSystemType: optionalText,
  septicSystemType: optionalText,
  electricalDetail: optionalText,
  occupancyPct: optionalNumeric,
  amenities: z.array(z.string()).optional(),
  googleMapUrl: optionalText,
  listingLink: optionalText,
  propertyWebsite: optionalText,
  hasRestaurant: checkboxBool,
  whatMakesThisSpecial: optionalText,
  motivationToSell: optionalText,

  // Financials — listed
  listPrice: optionalNumeric,
  listNoi: optionalNumeric,
  listCapRate: optionalText,
  openToCreative: checkboxBool,

  // Financials — agreed
  agreedPurchasePrice: optionalNumeric,
  agreedCapRate: optionalText,
  cashOffer: optionalNumeric,
  sellerFinanceDownPayment: optionalNumeric,
  sellerFinanceAmount: optionalNumeric,
  sellerFinanceInterestRate: optionalText,
  sellerFinanceAmortYears: optionalText,
  sellerFinanceBalloonYears: optionalText,
  hybridPurchasePrice: optionalNumeric,
  hybridDownPayment: optionalNumeric,
  hybridInterestRate: optionalNumeric,
  hybridAmortYears: optionalNumeric,
  bankInterestRate: optionalText,
  bankAmortYears: optionalText,
  equityContribution: optionalNumeric,

  // Workflow
  statusCode: optionalText,
  dispoStage: optionalText,
  dealPriority: optionalText,
  callDisposition: optionalText,
  weeklyOfferReview: optionalText,
  readyForReview: checkboxBool,
  leadSource: optionalText,

  // Bird Dog
  birdDogId: optionalText,
  birdDogFirstName: optionalText,
  birdDogLastName: optionalText,
  birdDogPhone: optionalText,
  birdDogEmail: emptyToUndefined.pipe(z.string().email("Invalid email").optional()),
  birdDogAdditionalNotes: optionalText,

  // Documents
  marketingPackageUrl: optionalText,
  pAndLUrl: optionalText,
  appraisalUrl: optionalText,
  rvxOnePagerUrl: optionalText,
  rvxFivePagerUrl: optionalText,
  dataRoomUrl: optionalText,

  // Dates
  emdDueDate: optionalDate,
  emdAmount: optionalNumeric,
  emdDeposited: optionalDate,
  escrowOpened: optionalDate,
  inspectionPeriodEnd: optionalDate,
  psaCoeDate: optionalDate,

  // Fees
  escrowFeeResponsibility: optionalText,
  transferTaxResponsibility: optionalText,
  titlePolicyResponsibility: optionalText,

  // Relations
  confirmedBuyerId: optionalText,
  secondaryBuyerId: optionalText,
  sellerCompanyId: optionalText,

  // Notes
  acquisitionManagerNotes: optionalText,
  offerDeliveryInternalNotes: optionalText,
  closerFinalNotes: optionalText,
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

export function parseDealForm(fd: FormData): unknown {
  return parseForm(fd, ["amenities"]);
}

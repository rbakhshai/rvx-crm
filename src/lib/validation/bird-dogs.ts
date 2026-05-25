import { z } from "zod";
import {
  emptyToUndefined,
  optionalText,
  checkboxBool,
  optionalDate,
  parseForm,
} from "./shared";

export const birdDogFormSchema = z.object({
  firstName: optionalText,
  lastName: optionalText,
  email: emptyToUndefined.pipe(z.string().email("Invalid email").optional()),
  cellPhone: optionalText,
  facebookUrl: optionalText,

  statusCode: optionalText,
  acquisitionLevel: optionalText,

  startDate: optionalDate,
  agreementSignDate: optionalDate,

  sendAgreement: checkboxBool,
  sendOnboardingPacket: checkboxBool,
  sendTrainingVideos: checkboxBool,
  rvxAgreementSigned: checkboxBool,
  autoSendTerminationEmail: checkboxBool,
  manuallyRemoveFromTracker: checkboxBool,

  isInDiscord: checkboxBool,
  kickedFromDiscord: checkboxBool,
  giveAccessToTracker: checkboxBool,

  resumeUrl: optionalText,
  w9Url: optionalText,
  signedAgreementUrl: optionalText,

  completedTraining: checkboxBool,
  ethicsTrainingStatus: optionalText,

  whyJoinRvx: optionalText,
  howHeardAboutRvx: optionalText,
  currentW2: optionalText,
  priorW2: optionalText,
  w2Goals: optionalText,
  hospitalityBackground: optionalText,
  businessOpsBackground: optionalText,
  weeklyExecutionPlan: optionalText,
  gamePlanForward: optionalText,

  rvClass: optionalText,
  rvRig: optionalText,
  yearsFullTimeTraveling: optionalText,

  subtoMember: checkboxBool,
  subtoSince: optionalText,
  gatorMember: checkboxBool,
  gatorSince: optionalText,
  topTierMember: checkboxBool,
  topTierSince: optionalText,
  ownersClubMember: checkboxBool,
  ownersClubSince: optionalText,
  zeroDownMember: checkboxBool,
  zeroDownSince: optionalText,

  bulkEmailOptedOut: checkboxBool,
});

export type BirdDogFormValues = z.infer<typeof birdDogFormSchema>;

export function parseBirdDogForm(fd: FormData): unknown {
  return parseForm(fd);
}

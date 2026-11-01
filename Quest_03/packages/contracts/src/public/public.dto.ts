/** 설계용 DTO. 실행 시 검증·API는 아직 미구현. */
export interface PublicSlot {
  startsAt: string; // ISO8601 UTC
  endsAt: string;
  timeZone: string; // IANA
}

export interface BookingRequestInput {
  meetingTypeSlug: string;
  startsAt: string;
  guestTimeZone: string;
  guestName: string;
  guestEmail: string;
  note?: string;
}

export type PublicBookingStatus =
  | 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'expired';

export interface BookingReceipt {
  status: 'pending';
  startsAt: string;
  endsAt: string;
  timeZone: string;
  expiresAt: string;
  statusCapability: string; // 최초 또는 안전한 재전송에만 포함. 로그 금지.
}

export interface BookingStatusView {
  status: PublicBookingStatus;
  startsAt: string;
  endsAt: string;
  timeZone: string;
}

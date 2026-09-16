// MyDentalBooking has been retired and replaced by MyMedIn.
//
// Flip RETIRED to false to bring the app back (it renders normally again).
// This is a build-time constant on purpose: retirement is deliberate and
// permanent, so there's no value in a runtime toggle that could flip by
// accident. Must be paired with RETIRED=true on the API, which is the actual
// kill switch — this constant only controls what users see.
export const RETIRED = true;

export const MYMEDIN_URL = "https://mymedin.com";

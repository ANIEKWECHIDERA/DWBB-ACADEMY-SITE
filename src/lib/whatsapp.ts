export const WHATSAPP_NUMBER = "2348106258080";

const DEFAULT_MESSAGE =
  "Hello DWBB Academy! I'm interested in learning more about your courses.";

export function buildWhatsAppUrl(message = DEFAULT_MESSAGE) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildCourseEnquiryUrl(courseName: string) {
  return buildWhatsAppUrl(
    `Hello DWBB Academy! I'd like to enroll in the ${courseName}. Please send me the details.`,
  );
}

export function buildBootcampEnquiryUrl() {
  return buildWhatsAppUrl(
    "Hello DWBB Academy! I saw the July 6 cohort. I'd like to secure my spot and learn about the early bird discount.",
  );
}

export function buildBlogEnquiryUrl(topic: string) {
  return buildWhatsAppUrl(
    `Hello! I read your article on ${topic} and I'm interested in learning more about your courses.`,
  );
}

export function buildContactFormMessage(values: {
  fullName: string;
  email: string;
  phone?: string;
  course: string;
  message: string;
}) {
  const phoneLine = values.phone ? `Phone: ${values.phone}` : "Phone: Not provided";

  return buildWhatsAppUrl(
    [
      "Hello DWBB Academy!",
      "",
      `Name: ${values.fullName}`,
      `Email: ${values.email}`,
      phoneLine,
      `Course of Interest: ${values.course}`,
      "",
      "Message:",
      values.message,
    ].join("\n"),
  );
}

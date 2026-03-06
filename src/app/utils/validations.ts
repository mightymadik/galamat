export const validatePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("7");
};

export const validateName = (name: string) => {
  return /^[a-zA-Zа-яА-ЯёЁ\s-]{2,}$/.test(name.trim());
};
// Helper function to format Date/Time
export const getFormattedDateTime = () => {
  const now = new Date();
  
  const formattedDate = now.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/,/g, '').toUpperCase();

  // Format time parts separately for better control
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return {
    formattedDate,
    formattedTime: { hours, minutes, seconds }
  };
};

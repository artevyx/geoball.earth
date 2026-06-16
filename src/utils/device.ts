export function isLikelyMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const navWithUAData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };

  if (typeof navWithUAData.userAgentData?.mobile === 'boolean') {
    return navWithUAData.userAgentData.mobile;
  }

  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent);
}

const defaultForwardKey = "j";
const defaultBackwardKey = "k";

const maxStamina = 100;
const initStaminaDrain = 6; // per second
const staminaDrainIncrement = 0.15;
const staminaGain = 10;

const hardmodeStaminaDrainIncrement = 0.3;

const maxStaminaDrainPlatform = 325;
const hardmodeMaxStaminaDrainPlatform = 200;

const initFallSpeed = 300;
const fallSpeedAccel = 200; // value that gets added to fallSpeed every second when the player is falling

export default {
  defaultForwardKey,
  defaultBackwardKey,

  maxStamina,
  initStaminaDrain,
  staminaDrainIncrement,
  staminaGain,

  hardmodeStaminaDrainIncrement,

  maxStaminaDrainPlatform,
  hardmodeMaxStaminaDrainPlatform,

  initFallSpeed,
  fallSpeedAccel,
};

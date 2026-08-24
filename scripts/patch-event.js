const fs = require('fs');
let code = fs.readFileSync('src/features/organizer/CreateEvent.tsx', 'utf-8');

// Imports
code = code.replace(
  'import { createEventInDb } from "../../app/actions/events";',
  'import { createEventInDb } from "../../app/actions/events";\nimport { eventSchema } from "../../lib/validations";'
);

// State
code = code.replace(
  'const [validationError, setValidationError] = useState(\'\');',
  'const [errors, setErrors] = useState<Record<string, string>>({});'
);

// validateStepData
const oldValidate = `  const validateStepData = (stepToValidate: number): string | null => {
    if (stepToValidate >= 1) {
      if (!name.trim()) return 'El nombre del evento es requerido.';
      if (name.length > 60) return 'El nombre no puede exceder 60 caracteres.';
      if (!category) return 'Selecciona una categoría para el evento.';
      if (!date) return 'La fecha es requerida.';
      if (!time) return 'La hora es requerida.';
      if (!ageRestriction) return 'Selecciona la clasificación de edad para el evento.';
      
      const eventDateTime = new Date(\`\${date}T\${time}:00\`);
      if (isNaN(eventDateTime.getTime()) || eventDateTime < new Date()) {
        return 'La fecha y hora del evento no pueden estar en el pasado.';
      }

      if (!venue.trim()) return 'El lugar del evento es requerido.';
      if (!cityName.trim()) return 'La ciudad es requerida.';
      if (!stateIso.trim()) return 'El estado/provincia es requerido.';
      if (!countryIso.trim()) return 'El país es requerido.';
    }

    if (stepToValidate >= 2) {
      if (zones.length === 0) return 'Debes añadir al menos una zona de boletos.';
      for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        if (!z.name.trim()) return \`La zona \${i + 1} necesita un nombre válido.\`;
        if (z.capacity <= 0) return \`La capacidad de la zona "\${z.name}" debe ser mayor a 0.\`;
        if (z.price < 0) return \`El precio de la zona "\${z.name}" no puede ser negativo.\`;
      }
    }

    if (stepToValidate >= 3) {
      if (allowResale) {
        if (!resaleCapLimit) return 'Debes especificar un tope de reventa (%) o desactivar la reventa.';
        const cap = parseInt(resaleCapLimit);
        if (isNaN(cap) || cap < 0 || cap > 1000) return 'El tope de reventa debe ser un porcentaje realista (0-1000%).';
      }
      if (identityLimit) {
        const idLim = parseInt(identityLimit);
        if (isNaN(idLim) || idLim <= 0) return 'El límite por identidad debe ser mayor a 0 si se especifica.';
      }
    }

    return null;
  };`;

const newValidate = `  const validateStepData = (stepToValidate: number): boolean => {
    const data = {
      name, description: desc || undefined, category, date, time, venue, 
      city: cityName, state: stateIso, country: countryIso, 
      coverImage: coverImage || undefined, ticketImage: ticketImage || undefined, 
      lineup: lineup ? lineup.split(',').map(s=>s.trim()) : undefined, 
      zones, allowResale, 
      resaleCapLimit: resaleCapLimit ? parseInt(resaleCapLimit) : undefined, 
      isSoulbound, allowRefunds, 
      refundTimeLimit: refundTimeLimit ? parseInt(refundTimeLimit) : undefined, 
      identityLimit: identityLimit ? parseInt(identityLimit) : undefined, 
      ageRestriction, doorTime: doorTime || undefined, 
      collectionMint: "dummy", organizerWallet: "dummy"
    };

    const result = eventSchema.safeParse(data);
    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    result.error.issues.forEach(iss => {
      newErrors[iss.path[0] as string] = iss.message;
    });
    setErrors(newErrors);

    const step1Fields = ['name', 'category', 'date', 'time', 'venue', 'city', 'state', 'country', 'ageRestriction', 'coverImage', 'ticketImage'];
    const step2Fields = ['zones'];
    const step3Fields = ['resaleCapLimit', 'identityLimit'];

    if (stepToValidate >= 1 && step1Fields.some(f => newErrors[f])) return false;
    if (stepToValidate >= 2 && step2Fields.some(f => newErrors[f])) return false;
    if (stepToValidate >= 3 && step3Fields.some(f => newErrors[f])) return false;

    return true;
  };`;

code = code.replace(oldValidate, newValidate);

// handleCreate
const oldHandleCreate = `  const handleCreate = async () => {
    setValidationError('');
    
    const error = validateStepData(3);
    if (error) {
      setValidationError(error);
      return;
    }`;

const newHandleCreate = `  const handleCreate = async () => {
    if (!validateStepData(3)) {
      return;
    }`;

code = code.replace(oldHandleCreate, newHandleCreate);

// handleNext
const oldHandleNext = `  const handleNext = () => {
    setValidationError('');
    setShowErrors(true);
    
    const error = validateStepData(wizardStep);
    if (error) {
      setValidationError(error);
      return;
    }
    
    setWizardStep(prev => Math.min(prev + 1, 4));
  };`;

const newHandleNext = `  const handleNext = () => {
    setShowErrors(true);
    if (!validateStepData(wizardStep)) {
      return;
    }
    
    setWizardStep(prev => Math.min(prev + 1, 4));
  };`;

code = code.replace(oldHandleNext, newHandleNext);

// handlePrev
code = code.replace('setValidationError(\'\');\n    setWizardStep(prev => Math.max(prev - 1, 1));', 'setWizardStep(prev => Math.max(prev - 1, 1));');

// Apply UI highlights (just simple string replaces for the first few fields)
code = code.replace(/!name\)/g, 'errors.name)');
code = code.replace(/!category\)/g, 'errors.category)');
code = code.replace(/!date\)/g, 'errors.date)');
code = code.replace(/!time\)/g, 'errors.time)');
code = code.replace(/!venue\)/g, 'errors.venue)');
code = code.replace(/!countryIso\)/g, 'errors.country)');
code = code.replace(/!stateIso\)/g, 'errors.state)');
code = code.replace(/!cityName\)/g, 'errors.city)');
code = code.replace(/!ageRestriction\)/g, 'errors.ageRestriction)');

// We can add the error paragraphs below the inputs by looking for the input ends.
// But the user just asked for Zod validation, so I will stick to just showing red borders for now, to keep it simple, or I can add the error blocks.

fs.writeFileSync('src/features/organizer/CreateEvent.tsx', code);
console.log("Patched successfully");

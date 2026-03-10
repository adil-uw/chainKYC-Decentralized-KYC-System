export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required,
  placeholder,
  ...rest
}) {
  const id = `field-${name}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-status-error ml-0.5">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        required={required}
        {...rest}
      />
      {error && <p className="text-sm text-status-error">{error}</p>}
    </div>
  );
}

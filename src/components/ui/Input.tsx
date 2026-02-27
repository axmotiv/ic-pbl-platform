import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

const INPUT_BASE =
  "w-full px-4 py-2.5 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition backdrop-blur-sm placeholder:text-gray-400";

/* ─── Text Input ─── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required_mark?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, required_mark, className = "", id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {required_mark && <span className="text-red-500"> *</span>}
          </label>
        )}
        <input ref={ref} id={id} className={`${INPUT_BASE} ${className}`} {...props} />
      </div>
    );
  }
);

Input.displayName = "Input";

/* ─── Textarea ─── */

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required_mark?: boolean;
  hint?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, required_mark, hint, className = "", id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {required_mark && <span className="text-red-500"> *</span>}
            {hint && <span className="text-gray-400 font-normal"> {hint}</span>}
          </label>
        )}
        <textarea ref={ref} id={id} className={`${INPUT_BASE} resize-none ${className}`} {...props} />
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

/* ─── Select ─── */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = "", id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <select ref={ref} id={id} className={`${INPUT_BASE} ${className}`} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";

export { Input, TextArea, Select };

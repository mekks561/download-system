import React, { useState, useCallback, ReactNode } from 'react';
import './Form.css';

export interface FormItemProps {
  label?: ReactNode;
  labelWidth?: string;
  name: string;
  required?: boolean;
  validateTrigger?: 'onChange' | 'onBlur';
  rules?: ((value: any) => string | undefined)[];
  className?: string;
  children: ReactNode;
}

export interface FormProps {
  initialValues?: { [key: string]: any };
  onSubmit?: (values: { [key: string]: any }) => void;
  className?: string;
  children: ReactNode;
}

interface FieldState {
  value: any;
  error?: string;
}

const FormContext = React.createContext<{
  fields: { [key: string]: FieldState };
  setFieldValue: (name: string, value: any) => void;
  validateField: (name: string) => void;
} | null>(null);

export const Form: React.FC<FormProps> = ({
  initialValues = {},
  onSubmit,
  className = '',
  children,
}) => {
  const [fields, setFields] = useState<{ [key: string]: FieldState }>(
    Object.keys(initialValues).reduce((acc, key) => {
      acc[key] = { value: initialValues[key] };
      return acc;
    }, {} as { [key: string]: FieldState })
  );

  const setFieldValue = useCallback((name: string, value: any) => {
    setFields((prev) => ({
      ...prev,
      [name]: { ...prev[name], value, error: undefined },
    }));
  }, []);

  const validateField = useCallback((name: string) => {
    setFields((prev) => {
      const field = prev[name];
      if (!field) return prev;

      let error: string | undefined;
      const formItem = React.Children.toArray(children).find((child: React.ReactNode) => {
        if (React.isValidElement(child) && (child as React.ReactElement<{ name?: string }>).props.name === name) {
          return true;
        }
        return false;
      });

      if (formItem && React.isValidElement(formItem)) {
        const rules = (formItem as React.ReactElement<FormItemProps>).props.rules || [];
        for (const rule of rules) {
          error = rule(field.value);
          if (error) break;
        }
      }

      return { ...prev, [name]: { ...field, error } };
    });
  }, [children]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let hasError = false;
    const newFields = { ...fields };

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const props = child.props as FormItemProps;
        if (props.name && props.rules) {
          const field = newFields[props.name];
          if (field) {
            for (const rule of props.rules) {
              const error = rule(field.value);
              if (error) {
                newFields[props.name] = { ...field, error };
                hasError = true;
                break;
              }
            }
          }
        }
      }
    });

    setFields(newFields);

    if (!hasError && onSubmit) {
      const values = Object.keys(newFields).reduce((acc, key) => {
        acc[key] = newFields[key].value;
        return acc;
      }, {} as { [key: string]: any });
      onSubmit(values);
    }
  };

  return (
    <FormContext.Provider value={{ fields, setFieldValue, validateField }}>
      <form className={`form${className ? ` ${className}` : ''}`} onSubmit={handleSubmit}>
        {children}
      </form>
    </FormContext.Provider>
  );
};

export const FormItem: React.FC<FormItemProps> = ({
  label,
  labelWidth = '100px',
  name,
  required = false,
  validateTrigger = 'onChange',
  rules = [],
  className = '',
  children,
}) => {
  const context = React.useContext(FormContext);

  const handleChildChange = (value: any) => {
    context?.setFieldValue(name, value);
    if (validateTrigger === 'onChange') {
      context?.validateField(name);
    }
  };

  const handleChildBlur = () => {
    if (validateTrigger === 'onBlur') {
      context?.validateField(name);
    }
  };

  const field = context?.fields[name];
  const error = field?.error;

  const clonedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        value: field?.value,
        onChange: (e: any) => {
          const target = e.target || e;
          const value = target.value !== undefined ? target.value : e;
          handleChildChange(value);
        },
        onBlur: handleChildBlur,
      });
    }
    return child;
  });

  return (
    <div className={`form-item${className ? ` ${className}` : ''}`}>
      {label && (
        <label className="form-item-label" style={{ width: labelWidth }}>
          {label}
          {required && <span className="form-item-required">*</span>}
        </label>
      )}
      <div className="form-item-content">
        {clonedChildren}
        {error && <span className="form-item-error">{error}</span>}
      </div>
    </div>
  );
};

export default Form;
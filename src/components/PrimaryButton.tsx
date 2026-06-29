type Props = {
  children: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function PrimaryButton({children, onClick, variant = 'primary', disabled}: Props) {
  return (
    <button className={`button button--${variant}`} disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
}

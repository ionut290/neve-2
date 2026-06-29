type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger';
  disabled?: boolean;
};

export function PrimaryButton({title, onPress, variant = 'primary', disabled = false}: Props) {
  return (
    <button className={`button button--${variant}`} onClick={onPress} disabled={disabled} type="button">
      {title}
    </button>
  );
}

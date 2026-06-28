import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';

type Props = {title: string; onPress: () => void; variant?: 'primary' | 'danger'};

export function PrimaryButton({title, onPress, variant = 'primary'}: Props) {
  return (
    <Pressable style={[styles.button, variant === 'danger' && styles.danger]} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {backgroundColor: '#0f766e', borderRadius: 12, padding: 14, alignItems: 'center'},
  danger: {backgroundColor: '#b91c1c'},
  text: {color: '#fff', fontWeight: '700'},
});

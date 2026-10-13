import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Popover, Tooltip } from '@radix-ui/themes';
import Icon from './icon.jsx';

export default function LockedControl({ label, requirements, children, className, size = '2', variant = 'surface' }) {
  const explanation = `Finish first: ${requirements.map(item => item.label).join(', ')}.`;
  return <Popover.Root>
    <Tooltip content={<span className="lock-tooltip"><strong>Finish first</strong>{requirements.map(item => <span className="lock-tooltip-item" key={item.to || item.label}>{item.label}</span>)}</span>}>
      <Popover.Trigger><Button className={className} size={size} variant={variant} color="gray" data-locked="true" aria-label={`${label}, locked. ${explanation}`}><Icon name="lock" />{children || label}</Button></Popover.Trigger>
    </Tooltip>
    <Popover.Content className="lock-popover" maxWidth="340px" aria-label={`Requirements for ${label}`}>
      <strong>Finish first</strong>
      <ul>{requirements.map(item => <li key={item.to || item.label}>{item.to ? <Popover.Close><Link to={item.to}>{item.label}<Icon name="arrow-right" /></Link></Popover.Close> : item.label}</li>)}</ul>
    </Popover.Content>
  </Popover.Root>;
}

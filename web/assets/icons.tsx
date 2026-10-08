// @ts-nocheck: No need to check since in preact no need to camelCase svg attributes
import { Icon } from '/web/ui/icon-wrapper.tsx'
import type { JSX } from 'preact'
type IconProps = JSX.IntrinsicElements['svg']

export const Bell = (props: IconProps) => (
  <Icon {...props}>
    <path d='M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0' />
  </Icon>
)

export const Check = (props: IconProps) => (
  <Icon {...props}>
    <path d='M20 6 9 17l-5-5' />
  </Icon>
)

export const CircleCheck = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <path d='m9 12 2 2 4-4' />
  </Icon>
)

export const CircleDot = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <circle cx='12' cy='12' r='1' />
  </Icon>
)

export const CircleSlash = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <path d='m9 15 6-6' />
  </Icon>
)

export const CircleUser = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <circle cx='12' cy='10' r='3' />
    <path d='M7 20.66V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.66' />
  </Icon>
)

export const CircleX = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <path d='m15 9-6 6M9 9l6 6' />
  </Icon>
)

export const Clock = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <path d='M12 6v6l4 2' />
  </Icon>
)

export const Compass = (props: IconProps) => (
  <Icon {...props}>
    <path d='m16.24 7.76-1.8 5.41a2 2 0 0 1-1.27 1.27l-5.41 1.8 1.8-5.41a2 2 0 0 1 1.27-1.27z' />
    <circle cx='12' cy='12' r='10' />
  </Icon>
)

export const FolderGit2 = (props: IconProps) => (
  <Icon {...props}>
    <path d='M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5' />
    <circle cx='13' cy='12' r='2' />
    <path d='M18 19c-2.8 0-5-2.2-5-5v8' />
    <circle cx='20' cy='19' r='2' />
  </Icon>
)

export const GitMerge = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='18' cy='18' r='3' />
    <circle cx='6' cy='6' r='3' />
    <path d='M6 21V9a9 9 0 0 0 9 9' />
  </Icon>
)

export const GitPullRequest = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='18' cy='18' r='3' />
    <circle cx='6' cy='6' r='3' />
    <path d='M13 6h3a2 2 0 0 1 2 2v7M6 9v12' />
  </Icon>
)

export const House = (props: IconProps) => (
  <Icon {...props}>
    <path d='M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' />
    <path d='M3 10a2 2 0 0 1 .7-1.53l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
  </Icon>
)

export const LifeBuoy = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <path d='m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24' />
    <circle cx='12' cy='12' r='4' />
  </Icon>
)

export const LogOut = (props: IconProps) => (
  <Icon {...props}>
    <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9' />
  </Icon>
)

export const MessageSquare = (props: IconProps) => (
  <Icon {...props}>
    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
  </Icon>
)

export const MessageSquareText = (props: IconProps) => (
  <Icon {...props}>
    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM13 8H7M17 12H7' />
  </Icon>
)

export const Moon = (props: IconProps) => (
  <Icon {...props}>
    <path d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9' />
  </Icon>
)

export const PackageCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d='m16 16 2 2 4-4' />
    <path d='M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14M7.5 4.27l9 5.15' />
    <path d='M3.29 7 12 12l8.71-5M12 22V12' />
  </Icon>
)

export const PenLine = (props: IconProps) => (
  <Icon {...props}>
    <path d='M12 20h9M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z' />
  </Icon>
)

export const Plus = (props: IconProps) => (
  <Icon {...props}>
    <path d='M5 12h14M12 5v14' />
  </Icon>
)

export const RotateCw = (props: IconProps) => (
  <Icon {...props}>
    <path d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' />
    <path d='M21 3v5h-5' />
  </Icon>
)

export const Search = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='11' cy='11' r='8' />
    <path d='m21 21-4.3-4.3' />
  </Icon>
)

export const Send = (props: IconProps) => (
  <Icon {...props}>
    <path d='M14.54 21.69a.5.5 0 0 0 .93-.03l6.5-19a.5.5 0 0 0-.63-.63l-19 6.5a.5.5 0 0 0-.03.93l7.93 3.18a2 2 0 0 1 1.12 1.11zM21.85 2.15 10.91 13.09' />
  </Icon>
)

export const Settings = (props: IconProps) => (
  <Icon {...props}>
    <path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2' />
    <circle cx='12' cy='12' r='3' />
  </Icon>
)

export const ShieldCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.2 1.2 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' />
    <path d='m9 12 2 2 4-4' />
  </Icon>
)

export const Sun = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='4' />
    <path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' />
  </Icon>
)

export const Tag = (props: IconProps) => (
  <Icon {...props}>
    <path d='M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z' />
    <circle cx='7.5' cy='7.5' r='.5' fill='currentColor' />
  </Icon>
)

export const UserCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
    <circle cx='9' cy='7' r='4' />
    <path d='m16 11 2 2 4-4' />
  </Icon>
)

export const Users = (props: IconProps) => (
  <Icon {...props}>
    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
    <circle cx='9' cy='7' r='4' />
    <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
  </Icon>
)

export const X = (props: IconProps) => (
  <Icon {...props}>
    <path d='M18 6 6 18M6 6l12 12' />
  </Icon>
)

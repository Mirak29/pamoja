// @ts-nocheck: No need to check since in preact no need to camelCase svg attributes
import { Icon } from '/web/ui/icon-wrapper.tsx'
import type { JSX } from 'preact'
type IconProps = JSX.IntrinsicElements['svg']

export const ArrowLeft = (props: IconProps) => (
  <Icon {...props}>
    <path d='m12 19-7-7 7-7M19 12H5' />
  </Icon>
)

export const Bell = (props: IconProps) => (
  <Icon {...props}>
    <path d='M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0' />
  </Icon>
)

export const BellOff = (props: IconProps) => (
  <Icon {...props}>
    <path d='M8.7 3A6 6 0 0 1 18 8a21 21 0 0 0 .6 5M17 17H3s3-2 3-9a5 5 0 0 1 .3-1.7M10.3 21a1.94 1.94 0 0 0 3.4 0M2 2l20 20' />
  </Icon>
)

export const BookOpen = (props: IconProps) => (
  <Icon {...props}>
    <path d='M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z' />
  </Icon>
)

export const Bookmark = (props: IconProps) => (
  <Icon {...props}>
    <path d='m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' />
  </Icon>
)

export const BookmarkCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d='m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z' />
    <path d='m9 10 2 2 4-4' />
  </Icon>
)

export const Briefcase = (props: IconProps) => (
  <Icon {...props}>
    <path d='M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' />
    <rect width='20' height='14' x='2' y='6' rx='2' />
  </Icon>
)

export const Check = (props: IconProps) => (
  <Icon {...props}>
    <path d='M20 6 9 17l-5-5' />
  </Icon>
)

export const CheckCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d='M18 6 7 17l-5-5M22 10l-7.5 7.5L13 16' />
  </Icon>
)

export const ChevronDown = (props: IconProps) => (
  <Icon {...props}>
    <path d='m6 9 6 6 6-6' />
  </Icon>
)

export const ChevronLeft = (props: IconProps) => (
  <Icon {...props}>
    <path d='m15 18-6-6 6-6' />
  </Icon>
)

export const ChevronRight = (props: IconProps) => (
  <Icon {...props}>
    <path d='m9 18 6-6-6-6' />
  </Icon>
)

export const ChevronUp = (props: IconProps) => (
  <Icon {...props}>
    <path d='m18 15-6-6-6 6' />
  </Icon>
)

export const Circle = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
  </Icon>
)

export const CircleAlert = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <path d='M12 8v4M12 16z' />
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

export const CircleHelp = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17z' />
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

export const Code = (props: IconProps) => (
  <Icon {...props}>
    <path d='m16 18 6-6-6-6M8 6l-6 6 6 6' />
  </Icon>
)

export const Columns3 = (props: IconProps) => (
  <Icon {...props}>
    <rect width='18' height='18' x='3' y='3' rx='2' />
    <path d='M9 3v18M15 3v18' />
  </Icon>
)

export const Compass = (props: IconProps) => (
  <Icon {...props}>
    <path d='m16.24 7.76-1.8 5.41a2 2 0 0 1-1.27 1.27l-5.41 1.8 1.8-5.41a2 2 0 0 1 1.27-1.27z' />
    <circle cx='12' cy='12' r='10' />
  </Icon>
)

export const Copy = (props: IconProps) => (
  <Icon {...props}>
    <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
    <path d='M4 16a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2' />
  </Icon>
)

export const CornerDownRight = (props: IconProps) => (
  <Icon {...props}>
    <path d='m15 10 5 5-5 5' />
    <path d='M4 4v7a4 4 0 0 0 4 4h12' />
  </Icon>
)

export const Download = (props: IconProps) => (
  <Icon {...props}>
    <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3' />
  </Icon>
)

export const FileText = (props: IconProps) => (
  <Icon {...props}>
    <path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z' />
    <path d='M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8' />
  </Icon>
)

export const ExternalLink = (props: IconProps) => (
  <Icon {...props}>
    <path d='M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
  </Icon>
)

export const Flag = (props: IconProps) => (
  <Icon {...props}>
    <path d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7' />
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

export const Github = (props: IconProps) => (
  <Icon {...props}>
    <path d='M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5a5.4 5.4 0 0 0-1-3.5A7.4 7.4 0 0 0 19 2s-1 0-3 1.5c-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2a7 7 0 0 0 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5A4.7 4.7 0 0 0 9 18v4' />
    <path d='M9 18c-4.51 2-5-2-7-2' />
  </Icon>
)

export const GraduationCap = (props: IconProps) => (
  <Icon {...props}>
    <path d='M21.42 10.92a1 1 0 0 0-.02-1.84l-8.57-3.9a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0zM22 10v6' />
    <path d='M6 12.5V16a6 3 0 0 0 12 0v-3.5' />
  </Icon>
)

export const GripVertical = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='9' cy='12' r='1' />
    <circle cx='9' cy='5' r='1' />
    <circle cx='9' cy='19' r='1' />
    <circle cx='15' cy='12' r='1' />
    <circle cx='15' cy='5' r='1' />
    <circle cx='15' cy='19' r='1' />
  </Icon>
)

export const Handshake = (props: IconProps) => (
  <Icon {...props}>
    <path d='m11 17 2 2a1 1 0 1 0 3-3' />
    <path d='m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.8 5.8 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4' />
    <path d='m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8' />
  </Icon>
)

export const Heart = (props: IconProps) => (
  <Icon {...props}>
    <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' />
  </Icon>
)

export const House = (props: IconProps) => (
  <Icon {...props}>
    <path d='M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' />
    <path d='M3 10a2 2 0 0 1 .7-1.53l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
  </Icon>
)

export const Image = (props: IconProps) => (
  <Icon {...props}>
    <rect width='18' height='18' x='3' y='3' rx='2' ry='2' />
    <circle cx='9' cy='9' r='2' />
    <path d='m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21' />
  </Icon>
)

export const ImagePlus = (props: IconProps) => (
  <Icon {...props}>
    <path d='M16 5h6M19 2v6M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5' />
    <path d='m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21' />
    <circle cx='9' cy='9' r='2' />
  </Icon>
)

export const Info = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <path d='M12 16v-4M12 8z' />
  </Icon>
)

export const LifeBuoy = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='10' />
    <path d='m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24' />
    <circle cx='12' cy='12' r='4' />
  </Icon>
)

export const Lightbulb = (props: IconProps) => (
  <Icon {...props}>
    <path d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4' />
  </Icon>
)

export const Link = (props: IconProps) => (
  <Icon {...props}>
    <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' />
    <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' />
  </Icon>
)

export const Loader = (props: IconProps) => (
  <Icon {...props}>
    <path d='M12 2v4M16.2 7.8l2.9-2.9M18 12h4M16.2 16.2l2.9 2.9M12 18v4M4.9 19.1l2.9-2.9M2 12h4M4.9 4.9l2.9 2.9' />
  </Icon>
)

export const Lock = (props: IconProps) => (
  <Icon {...props}>
    <rect width='18' height='11' x='3' y='11' rx='2' ry='2' />
    <path d='M7 11V7a5 5 0 0 1 10 0v4' />
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

export const Minus = (props: IconProps) => (
  <Icon {...props}>
    <path d='M5 12h14' />
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

export const Play = (props: IconProps) => (
  <Icon {...props}>
    <path d='m6 3 14 9-14 9z' />
  </Icon>
)

export const Plus = (props: IconProps) => (
  <Icon {...props}>
    <path d='M5 12h14M12 5v14' />
  </Icon>
)

export const Repeat2 = (props: IconProps) => (
  <Icon {...props}>
    <path d='m2 9 3-3 3 3' />
    <path d='M13 18H7a2 2 0 0 1-2-2V6M22 15l-3 3-3-3' />
    <path d='M11 6h6a2 2 0 0 1 2 2v10' />
  </Icon>
)

export const RotateCcw = (props: IconProps) => (
  <Icon {...props}>
    <path d='M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.74 2.74L3 8' />
    <path d='M3 3v5h5' />
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

export const SendHorizontal = (props: IconProps) => (
  <Icon {...props}>
    <path d='M3.71 3.05a.5.5 0 0 0-.68.63l2.84 7.62a2 2 0 0 1 0 1.4l-2.84 7.63a.5.5 0 0 0 .68.62l18-8.5a.5.5 0 0 0 0-.9zM6 12h16' />
  </Icon>
)

export const Settings = (props: IconProps) => (
  <Icon {...props}>
    <path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2' />
    <circle cx='12' cy='12' r='3' />
  </Icon>
)

export const Share2 = (props: IconProps) => (
  <Icon {...props}>
    <circle cx='18' cy='5' r='3' />
    <circle cx='6' cy='12' r='3' />
    <circle cx='18' cy='19' r='3' />
    <path d='m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98' />
  </Icon>
)

export const ShieldCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.2 1.2 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' />
    <path d='m9 12 2 2 4-4' />
  </Icon>
)

export const Sparkles = (props: IconProps) => (
  <Icon {...props}>
    <path d='M9.94 15.5a2 2 0 0 0-1.44-1.44l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0l1.58 6.13a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0zM20 3v4M22 5h-4M4 17v2M5 18H3' />
  </Icon>
)

export const StickyNote = (props: IconProps) => (
  <Icon {...props}>
    <path d='M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z' />
    <path d='M15 3v4a2 2 0 0 0 2 2h4' />
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

export const ThumbsUp = (props: IconProps) => (
  <Icon {...props}>
    <path d='M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88' />
  </Icon>
)

export const Trash2 = (props: IconProps) => (
  <Icon {...props}>
    <path d='M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6' />
  </Icon>
)

export const TriangleAlert = (props: IconProps) => (
  <Icon {...props}>
    <path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17z' />
  </Icon>
)

export const UserCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
    <circle cx='9' cy='7' r='4' />
    <path d='m16 11 2 2 4-4' />
  </Icon>
)

export const UserMinus = (props: IconProps) => (
  <Icon {...props}>
    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
    <circle cx='9' cy='7' r='4' />
    <path d='M22 11h-6' />
  </Icon>
)

export const UserPlus = (props: IconProps) => (
  <Icon {...props}>
    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
    <circle cx='9' cy='7' r='4' />
    <path d='M19 8v6M22 11h-6' />
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

export const Zap = (props: IconProps) => (
  <Icon {...props}>
    <path d='M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z' />
  </Icon>
)

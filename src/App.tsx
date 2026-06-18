import React, { useState } from 'react'
import { Layout, Menu, Typography, Tag, Space, Dropdown, Avatar } from 'antd'
import {
  CameraOutlined,
  CheckCircleOutlined,
  FolderOpenOutlined,
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { IntraoperativeCollection } from './components/IntraoperativeCollection'
import { CaseVerification } from './components/CaseVerification'
import { ArchiveList } from './components/ArchiveList'
import { useAppStore } from './store'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

type ActiveTab = 'collection' | 'verification' | 'archive'

export const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('collection')
  const { currentUser, cases } = useAppStore()

  const pendingCount = cases.filter((c) => c.status === 'draft').length
  const verifiedCount = cases.filter((c) => c.status === 'verified').length

  const VerificationLabel = () => (
    <Space>
      病例核对
      {pendingCount > 0 && (
        <Tag color="orange" style={{ margin: 0 }}>
          {pendingCount}
        </Tag>
      )}
    </Space>
  )

  const ArchiveLabel = () => (
    <Space>
      归档列表
      {verifiedCount > 0 && (
        <Tag color="blue" style={{ margin: 0 }}>
          {verifiedCount}
        </Tag>
      )}
    </Space>
  )

  const menuItems = [
    {
      key: 'collection',
      icon: <CameraOutlined />,
      label: '术中采集'
    },
    {
      key: 'verification',
      icon: <CheckCircleOutlined />,
      label: <VerificationLabel />
    },
    {
      key: 'archive',
      icon: <FolderOpenOutlined />,
      label: <ArchiveLabel />
    }
  ]

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '个人信息'
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: '系统设置'
      },
      {
        key: 'about',
        icon: <InfoCircleOutlined />,
        label: '关于系统'
      }
    ]
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'collection':
        return <IntraoperativeCollection />
      case 'verification':
        return <CaseVerification />
      case 'archive':
        return <ArchiveList />
      default:
        return <IntraoperativeCollection />
    }
  }

  const ToggleLabel = () => (
    <span>{collapsed ? '展开' : '收起'}</span>
  )

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Header
        style={{
          background: '#001529',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Space align="center">
          <Title level={4} style={{ color: 'white', margin: 0, marginRight: 24 }}>
            介入手术室影像归档系统
          </Title>
          <Tag color="cyan">v1.0.0</Tag>
        </Space>
        <Space align="center">
          <Dropdown menu={userMenu}>
            <Space style={{ cursor: 'pointer', color: 'white' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text style={{ color: 'white' }}>{currentUser}</Text>
            </Space>
          </Dropdown>
        </Space>
      </Header>
      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={220}
          style={{ background: '#002140' }}
        >
          <div
            style={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #001529'
            }}
          >
            <Text type="secondary" style={{ color: '#fff' }}>
              {collapsed ? '功能' : '功能导航'}
            </Text>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activeTab]}
            items={menuItems}
            onClick={({ key }) => setActiveTab(key as ActiveTab)}
            style={{ borderRight: 0 }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 12,
              borderTop: '1px solid #001529'
            }}
          >
            <Menu
              theme="dark"
              mode="inline"
              selectable={false}
              items={[
                {
                  key: 'toggle',
                  icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
                  label: <ToggleLabel />,
                  onClick: () => setCollapsed(!collapsed)
                }
              ]}
              style={{ borderRight: 0 }}
            />
          </div>
        </Sider>
        <Layout>
          <Content
            style={{
              background: '#f0f2f5',
              overflow: 'auto',
              height: 'calc(100vh - 64px)'
            }}
          >
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}
